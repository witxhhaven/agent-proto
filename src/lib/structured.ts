import { z } from "zod";
import { callLlm, complete } from "@/lib/llm";
import { createId } from "@/lib/id";
import { mockTools } from "@/data/mockTools";
import { mockAgentDraft, type AgentDraft } from "@/lib/agentDraft";
import type {
  IntakeAnswer,
  IntakeQuestion,
  RenderedQuestion,
  ScheduleTiming,
} from "@/types";

// ---------------------------------------------------------------------------
// generateStructured — the one helper everything funnels through.
// ---------------------------------------------------------------------------
export async function generateStructured<T>(opts: {
  schema: z.ZodType<T>;
  jsonSchema: object;
  toolName: string;
  toolDescription: string;
  system?: string;
  prompt: string;
  mock: () => T;
}): Promise<T> {
  try {
    const res = await callLlm({
      mode: "structured",
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      tool: {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.jsonSchema,
      },
    });
    if (res.mock || !res.data) return opts.mock();
    const parsed = opts.schema.safeParse(res.data);
    return parsed.success ? parsed.data : opts.mock();
  } catch {
    // Network/LLM error must never dead-end the UI.
    return opts.mock();
  }
}

// ---------------------------------------------------------------------------
// 1. renderQuestion — intake flow
// ---------------------------------------------------------------------------
const RenderedOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
});
const RenderedQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(RenderedOptionSchema).min(2).max(6),
  allowFreeText: z.literal(true),
  allowMultiple: z.boolean(),
  subQuestionOf: z.string().optional(),
});
const RenderQuestionsSchema = z.object({
  questions: z.array(RenderedQuestionSchema).min(1).max(3),
});

const RENDER_QUESTIONS_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          prompt: { type: "string" },
          options: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                description: { type: "string" },
              },
              required: ["id", "label"],
            },
          },
          allowFreeText: { type: "boolean" },
          allowMultiple: { type: "boolean" },
          subQuestionOf: { type: "string" },
        },
        required: ["id", "prompt", "options", "allowFreeText", "allowMultiple"],
      },
    },
  },
  required: ["questions"],
};

export async function renderQuestion(
  question: IntakeQuestion,
  ctx: {
    agentName: string;
    agentDescription: string;
    priorAnswers: IntakeAnswer[];
  }
): Promise<RenderedQuestion[]> {
  const priors = ctx.priorAnswers
    .map(
      (a) =>
        `- ${a.prompt}: ${
          a.skipped
            ? "(skipped)"
            : [...a.selectedOptionLabels, a.freeText].filter(Boolean).join(", ")
        }`
    )
    .join("\n");

  const result = await generateStructured({
    schema: RenderQuestionsSchema,
    jsonSchema: RENDER_QUESTIONS_JSON_SCHEMA,
    toolName: "render_questions",
    toolDescription:
      "Return a UI-renderable multiple-choice version of an agent intake question.",
    system:
      "You help end-users answer an AI agent's intake questions. Given one raw question, produce a clear multiple-choice version with 2-6 realistic options. Always set allowFreeText true. If the question is broad or compound, split it into up to 3 focused sub-questions (set subQuestionOf to the original id). Reword for clarity but keep the intent. Consider the user's prior answers.",
    prompt: `Agent: ${ctx.agentName}\nAbout: ${ctx.agentDescription}\nRaw question (id ${
      question.id
    }): ${question.prompt}\nAllow multiple: ${
      question.allowMultiple ? "yes" : "no"
    }\nPrior answers:\n${priors || "(none)"}`,
    mock: () => mockRenderQuestion(question),
  });

  return result.questions;
}

function mockRenderQuestion(question: IntakeQuestion): {
  questions: RenderedQuestion[];
} {
  // The onboarding scheduling question gets concrete recurrence options so a
  // single click carries enough to create a schedule (each label parses via
  // extractSchedule). Other questions fall back to a generic yes/no.
  const isScheduling =
    question.id === "q-scheduling" || /schedul/i.test(question.prompt);
  const options = isScheduling
    ? [
        { id: createId("opt"), label: "Every weekday at 8am" },
        { id: createId("opt"), label: "Daily at 9am" },
        { id: createId("opt"), label: "Weekly on Mondays at 9am" },
        { id: createId("opt"), label: "No, run manually" },
      ]
    : [
        { id: createId("opt"), label: "Yes" },
        { id: createId("opt"), label: "No" },
        { id: createId("opt"), label: "Not sure" },
      ];
  return {
    questions: [
      {
        id: question.id,
        prompt: question.prompt,
        options,
        allowFreeText: true,
        allowMultiple: question.allowMultiple ?? false,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. generateAgentDraft — AI-assist drawer (real, with mock fallback)
// ---------------------------------------------------------------------------
const IntakeQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  helpText: z.string().optional(),
  allowMultiple: z.boolean().optional(),
});
const AgentDraftSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  questions: z.array(IntakeQuestionSchema).min(1).max(6),
});

const AGENT_DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    instructions: { type: "string" },
    toolIds: { type: "array", items: { type: "string" } },
    questions: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          prompt: { type: "string" },
          helpText: { type: "string" },
          allowMultiple: { type: "boolean" },
        },
        required: ["id", "prompt"],
      },
    },
  },
  required: ["questions"],
};

export async function generateAgentDraft(
  description: string,
  currentQuestions: IntakeQuestion[] = []
): Promise<AgentDraft> {
  const toolList = mockTools
    .map((t) => `${t.id} — ${t.name} (${t.provider})`)
    .join("\n");

  const draft = await generateStructured({
    schema: AgentDraftSchema,
    jsonSchema: AGENT_DRAFT_JSON_SCHEMA,
    toolName: "draft_agent",
    toolDescription:
      "Propose settings + intake questions for an AI agent the user is building.",
    system:
      "You help a creator design an AI agent. From their description, propose a name, a one-line description, system instructions, a few relevant tools (from the provided list only, by id), and a set of intake questions an end-user should answer before the agent starts.",
    prompt: `Description: ${description}\n\nAvailable tools (use ids only):\n${toolList}`,
    mock: () => mockAgentDraft(description, currentQuestions),
  });

  // keep only valid tool ids the model may have picked
  const validIds = new Set(mockTools.map((t) => t.id));
  return {
    ...draft,
    toolIds: (draft.toolIds ?? []).filter((id) => validIds.has(id)),
  };
}

// ---------------------------------------------------------------------------
// 2b. assistAgentChat — conversational AI-assist that fills the form per turn
// ---------------------------------------------------------------------------
const AssistChatSchema = z.object({
  reply: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  questions: z.array(IntakeQuestionSchema).optional(),
});
export type AssistChatResult = z.infer<typeof AssistChatSchema>;

const ASSIST_CHAT_JSON_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    instructions: { type: "string" },
    toolIds: { type: "array", items: { type: "string" } },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          prompt: { type: "string" },
          helpText: { type: "string" },
          allowMultiple: { type: "boolean" },
        },
        required: ["id", "prompt"],
      },
    },
  },
  required: ["reply"],
};

/**
 * One conversational turn of the AI-assist agent builder. Each call both (a)
 * fills in as much of the agent draft as it can from the conversation and (b)
 * returns a short chat `reply` that asks the creator clarifying questions.
 * Mock-first: a deterministic reply + draft when no API key is present.
 */
export async function assistAgentChat(
  messages: { role: "user" | "assistant"; content: string }[],
  currentQuestions: IntakeQuestion[] = []
): Promise<AssistChatResult> {
  const toolList = mockTools
    .map((t) => `${t.id} — ${t.name} (${t.provider})`)
    .join("\n");
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Creator" : "Assistant"}: ${m.content}`)
    .join("\n");

  const result = await generateStructured({
    schema: AssistChatSchema,
    jsonSchema: ASSIST_CHAT_JSON_SCHEMA,
    toolName: "assist_agent_chat",
    toolDescription:
      "Continue a conversation that helps a creator build an AI agent, filling in the agent's draft fields each turn.",
    system:
      "You are an assistant that helps a creator build an AI agent through a short back-and-forth. On EVERY turn: (1) fill in as much of the agent draft as you reasonably can from the conversation so far — a name, a one-line description, practical system instructions, relevant tools (from the provided list, by id only), and 2-5 intake questions an end-user should answer before the agent runs; and (2) write a brief, friendly reply of 2-4 sentences, in plain text with no markdown, that notes what you filled in and asks 1-2 specific clarifying questions to improve the agent. Only include draft fields you can sensibly populate. Always include `reply`.",
    prompt: `Conversation so far:\n${transcript}\n\nAvailable tools (use ids only):\n${toolList}\n\nReturn the updated draft fields and your next reply.`,
    mock: () => mockAssistChat(messages, currentQuestions),
  });

  const validIds = new Set(mockTools.map((t) => t.id));
  return {
    ...result,
    toolIds: (result.toolIds ?? []).filter((id) => validIds.has(id)),
  };
}

function mockAssistChat(
  messages: { role: "user" | "assistant"; content: string }[],
  currentQuestions: IntakeQuestion[]
): AssistChatResult {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const turns = messages.filter((m) => m.role === "user").length;
  const base = mockAgentDraft(lastUser?.content ?? "", currentQuestions);
  const reply =
    turns <= 1
      ? `I've drafted a starting point for ${base.name} and filled in the description, instructions, and a couple of intake questions on the form. To sharpen it: who are the main users, and what tone should its responses take?`
      : `Got it — I've updated the draft on the form to reflect that. Are there specific tools or data sources it should use, and is there anything it should avoid doing?`;
  return { ...base, reply };
}

// ---------------------------------------------------------------------------
// 2c. synthesizeScheduleInstruction — turn intake answers into a task instruction
// ---------------------------------------------------------------------------
/**
 * Compose a concise, natural instruction for a recurring run of `agent`,
 * incorporating the user's onboarding (MCQ) answers. Mock-first: a deterministic
 * sentence from the answers when no API key is present.
 */
export async function synthesizeScheduleInstruction(
  agent: { name: string; description: string; instructions: string },
  answers: { prompt: string; answer: string }[]
): Promise<string> {
  const prefs = answers
    .filter((a) => a.answer)
    .map((a) => `- ${a.prompt}: ${a.answer}`)
    .join("\n");

  const mock = () => {
    const joined = answers.map((a) => a.answer).filter(Boolean).join("; ");
    return joined
      ? `${agent.description} Tailor each run to: ${joined}.`
      : agent.description;
  };

  try {
    const res = await callLlm({
      mode: "text",
      system:
        "You write a single concise instruction (1-2 sentences) for a recurring scheduled run of an AI agent. Incorporate the user's stated preferences. Do NOT mention scheduling, timing, frequency, or cron — only the task itself. Output only the instruction text, no preamble or quotes.",
      messages: [
        {
          role: "user",
          content: `Agent: ${agent.name}\nPurpose: ${agent.description}\nBase instructions: ${
            agent.instructions || "(none)"
          }\n\nUser preferences from onboarding:\n${
            prefs || "(none)"
          }\n\nWrite the instruction.`,
        },
      ],
    });
    if (res.mock || !res.text) return mock();
    return res.text.trim();
  } catch {
    return mock();
  }
}

// ---------------------------------------------------------------------------
// 3. extractSchedule — chat + schedule AI-assist
// ---------------------------------------------------------------------------
const ExtractScheduleSchema = z.object({
  isSchedule: z.boolean(),
  title: z.string(),
  instructionsText: z.string(),
  timing: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(28).optional(),
  }),
  agentId: z.string().nullable().optional(),
});
export type ExtractedSchedule = z.infer<typeof ExtractScheduleSchema>;

const EXTRACT_SCHEDULE_JSON_SCHEMA = {
  type: "object",
  properties: {
    isSchedule: { type: "boolean" },
    title: { type: "string" },
    instructionsText: { type: "string" },
    timing: {
      type: "object",
      properties: {
        frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
        hour: { type: "number" },
        minute: { type: "number" },
        dayOfWeek: { type: "number" },
        dayOfMonth: { type: "number" },
      },
      required: ["frequency", "hour", "minute"],
    },
    agentId: { type: ["string", "null"] },
  },
  required: ["isSchedule", "title", "instructionsText", "timing"],
};

/**
 * Cheap, synchronous pre-check so a normal chat message doesn't pay for a full
 * LLM round-trip just to discover it isn't a scheduling request. Only when this
 * returns true do we call the (slower) LLM extractor.
 */
// A deliberately permissive signal: any hint of timing, recurrence, reminders,
// or "send/notify me…" surfaces the (mocked) schedule UI. Kept generous so the
// schedule card appears as often as possible in the demo.
export function hasScheduleSignal(message: string): boolean {
  return (
    RECURRENCE_RE.test(message) ||
    FREQ_RE.test(message) ||
    DOW_RE.test(message) ||
    SCHEDULE_KEYWORD_RE.test(message) ||
    CLOCK_RE.test(message)
  );
}

export function looksLikeSchedule(message: string): boolean {
  return hasScheduleSignal(message);
}

export async function extractSchedule(
  message: string,
  agents: { id: string; name: string }[] = []
): Promise<ExtractedSchedule> {
  const agentList = agents.map((a) => `${a.id} — ${a.name}`).join("\n");
  return generateStructured({
    schema: ExtractScheduleSchema,
    jsonSchema: EXTRACT_SCHEDULE_JSON_SCHEMA,
    toolName: "extract_schedule",
    toolDescription:
      "Decide if the user wants to schedule a recurring task and extract it.",
    system:
      "Decide if the user wants something done on a schedule or at a later/repeating time. Lean towards isSchedule TRUE whenever the message mentions any timing, recurrence, reminder, digest, or a 'send/notify/email me…' request — even if the cadence is vague (default to a sensible daily timing). Only set isSchedule false for messages with no timing or task-to-run intent at all. When true, extract a short title, the task instructions, and the timing. If the user references one of their saved agents by name, set agentId.",
    prompt: `Message: ${message}\n\nSaved agents:\n${agentList || "(none)"}`,
    mock: () => mockExtractSchedule(message, agents),
  });
}

const RECURRENCE_RE =
  /(every|each)\s+(day|morning|afternoon|evening|night|week|weekday|weekdays|weekend|month|hour|quarter|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
const FREQ_RE = /\b(daily|weekly|monthly)\b/i;
const TIME_RE = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
// Broader signals used only to DECIDE whether something is schedule-ish (not for
// parsing). Kept generous so the mocked schedule UI shows as often as possible.
const DOW_RE =
  /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
const SCHEDULE_KEYWORD_RE =
  /\b(remind|reminder|schedule|scheduled|recurring|recurrence|repeat(?:ed|edly)?|notify|notification|digest|newsletter|every|each|daily|weekly|monthly|hourly|nightly|quarterly|annually|yearly|tomorrow|tonight|weekday|weekends?|once a|send me|email me|every morning)\b/i;
const CLOCK_RE =
  /\b(\d{1,2}\s*(?:am|pm)|\d{1,2}:\d{2}|noon|midnight|morning|afternoon|evening)\b/i;
const DOW: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function mockExtractSchedule(
  message: string,
  agents: { id: string; name: string }[] = []
): ExtractedSchedule {
  const freqMatch = message.match(FREQ_RE);
  const timeMatch = message.match(TIME_RE);
  const isSchedule = hasScheduleSignal(message);

  // timing
  let frequency: ScheduleTiming["frequency"] = "daily";
  let dayOfWeek: number | undefined;
  if (freqMatch) frequency = freqMatch[1].toLowerCase() as ScheduleTiming["frequency"];
  const dowMatch = message.toLowerCase().match(
    /(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/
  );
  if (dowMatch) {
    frequency = "weekly";
    dayOfWeek = DOW[dowMatch[1]];
  }
  if (/\bmonth/i.test(message)) frequency = frequency === "weekly" ? frequency : "monthly";

  let hour = 9;
  let minute = 0;
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const mer = timeMatch[3]?.toLowerCase();
    if (mer === "pm" && hour < 12) hour += 12;
    if (mer === "am" && hour === 12) hour = 0;
  }

  // agent mention
  let agentId: string | null = null;
  for (const a of agents) {
    if (message.toLowerCase().includes(a.name.toLowerCase())) {
      agentId = a.id;
      break;
    }
  }

  const words = message.trim().split(/\s+/).slice(0, 6).join(" ");
  return {
    isSchedule,
    title: words || "Scheduled task",
    instructionsText: message.trim(),
    timing: {
      frequency,
      hour,
      minute,
      ...(frequency === "weekly" ? { dayOfWeek: dayOfWeek ?? 1 } : {}),
      ...(frequency === "monthly" ? { dayOfMonth: 1 } : {}),
    },
    agentId,
  };
}

// ---------------------------------------------------------------------------
// 4. summariseChatForSchedule — document an agent chat into schedule instructions
// ---------------------------------------------------------------------------
type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Turn an agent-chat conversation into detailed standing instructions for a
 * recurring task. Uses the LLM when a key is present; otherwise falls back to a
 * deterministic write-up that still documents what was discussed (mock-first).
 */
export async function summariseChatForSchedule(
  history: ChatTurn[],
  agentName: string
): Promise<string> {
  const turns = history.filter((m) => m.content.trim());
  const transcript = turns
    .map((m) => `${m.role === "user" ? "User" : agentName}: ${m.content.trim()}`)
    .join("\n");

  const system =
    "You convert a conversation into clear, detailed standing instructions for a recurring scheduled task. Capture exactly what the user wants done, all specifics, context, desired format, and any constraints raised in the chat. Write it as direct instructions to the agent. Be thorough but well-structured.";
  try {
    const res = await complete(
      [
        {
          role: "user",
          content: `Conversation with ${agentName}:\n\n${transcript}\n\nWrite detailed standing instructions for the recurring task the user wants set up, documenting the relevant details from this conversation.`,
        },
      ],
      system
    );
    if (res.text && res.text.trim() && !res.mock) return res.text.trim();
  } catch {
    // fall through to the deterministic summary below
  }
  return localScheduleSummary(turns, agentName);
}

function localScheduleSummary(turns: ChatTurn[], agentName: string): string {
  const asks = turns.filter((m) => m.role === "user");
  const lines: string[] = [];
  lines.push(`Recurring task set up from a conversation with ${agentName}.`);
  lines.push("");
  lines.push("What the user asked for:");
  if (asks.length) {
    asks.forEach((m) => lines.push(`• ${m.content.trim()}`));
  } else {
    lines.push("• (no specific request was captured)");
  }
  const lastReply = [...turns]
    .reverse()
    .find((m) => m.role === "assistant");
  if (lastReply) {
    lines.push("");
    lines.push("Context from the conversation:");
    lines.push(lastReply.content.trim());
  }
  lines.push("");
  lines.push(
    `On each run, ${agentName} should carry out the above on the configured schedule.`
  );
  return lines.join("\n");
}
