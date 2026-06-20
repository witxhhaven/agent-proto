import { z } from "zod";
import { callLlm } from "@/lib/llm";
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
  return {
    questions: [
      {
        id: question.id,
        prompt: question.prompt,
        options: [
          { id: createId("opt"), label: "Yes" },
          { id: createId("opt"), label: "No" },
          { id: createId("opt"), label: "Not sure" },
        ],
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
export function looksLikeSchedule(message: string): boolean {
  return (
    RECURRENCE_RE.test(message) ||
    FREQ_RE.test(message) ||
    /\b(remind|schedule|every day|each day)\b/i.test(message)
  );
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
      "Decide if the user is asking to schedule a recurring task. If so, set isSchedule true and extract a short title, the task instructions, and the timing. If the user references one of their saved agents by name, set agentId. Otherwise isSchedule false.",
    prompt: `Message: ${message}\n\nSaved agents:\n${agentList || "(none)"}`,
    mock: () => mockExtractSchedule(message, agents),
  });
}

const RECURRENCE_RE =
  /(every|each)\s+(day|morning|week|weekday|weekdays|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
const FREQ_RE = /\b(daily|weekly|monthly)\b/i;
const TIME_RE = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
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
  const hasRecurrence = RECURRENCE_RE.test(message);
  const freqMatch = message.match(FREQ_RE);
  const timeMatch = message.match(TIME_RE);
  const isSchedule = hasRecurrence || !!freqMatch;

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
