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
