# ai/structured-output.md — text → typed JSON the UI renders

This is the reusable pattern behind the whole "run a field through the LLM and convert it to a
format the UI uses to render" idea. Everything funnels through one helper with a **zod schema** and
**Anthropic tool-use** (forced tool = guaranteed JSON), plus a **mock fallback**.

## 1. `generateStructured` — `src/lib/structured.ts`

```ts
import { z } from "zod";
import { callLlm } from "@/lib/llm";

export async function generateStructured<T>(opts: {
  schema: z.ZodType<T>;
  jsonSchema: object;          // JSON Schema mirror of `schema` for the tool input_schema
  toolName: string;
  toolDescription: string;
  system?: string;
  prompt: string;
  mock: () => T;               // deterministic fallback when no API key
}): Promise<T> {
  const res = await callLlm({
    mode: "structured",
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    tool: { name: opts.toolName, description: opts.toolDescription, input_schema: opts.jsonSchema },
  });
  if (res.mock || !res.data) return opts.mock();
  const parsed = opts.schema.safeParse(res.data);   // validate the model output
  return parsed.success ? parsed.data : opts.mock(); // fall back if the model drifts
}
```

Keep the zod schema and the JSON Schema in sync (or derive one from the other with a small helper /
`zod-to-json-schema` if you prefer to add the dep). Validation is the safety net: if the model
returns something off-shape, we degrade to the mock instead of crashing the UI.

## 2. `renderQuestion` (used by the intake flow)

```ts
const RenderedOptionSchema = z.object({
  id: z.string(), label: z.string(), description: z.string().optional(),
});
const RenderedQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(RenderedOptionSchema).min(2).max(6),
  allowFreeText: z.literal(true),
  allowMultiple: z.boolean(),
  subQuestionOf: z.string().optional(),
});
const RenderQuestionsSchema = z.object({ questions: z.array(RenderedQuestionSchema).min(1).max(3) });
```

System prompt (essence):
> You help end-users answer an AI agent's intake questions. Given one raw question, produce a
> clear multiple-choice version with 2–6 realistic options. Always set `allowFreeText` true. If the
> question is broad or compound, split it into up to 3 focused sub-questions (set `subQuestionOf` to
> the original id). Reword for clarity but keep the intent. Consider the user's prior answers.

User prompt: include `agentName`, `agentDescription`, the raw `question.prompt`, `allowMultiple`
hint, and a compact list of `priorAnswers`. Call `generateStructured` with
`RenderQuestionsSchema`, then return `.questions`.

**Mock:** return one `RenderedQuestion` with options `["Yes","No","Not sure"]`,
`allowFreeText: true`, ids via `createId`.

## 3. `generateAgentDraft` (used by the AI-assist drawer)

Schema: `{ name?, description?, instructions?, toolIds?: string[], questions: IntakeQuestion[] }`
(2–6 questions). `toolIds` must be chosen from the `mockTools` catalog — pass the available tool
ids/names in the prompt so the model only picks valid ones. System prompt: "You help a creator
design an AI agent. From their description, propose a name, a one-line description, system
instructions, a few relevant tools (from the provided list only), and a set of intake questions an
end-user should answer before the agent starts." **Mock:** 3 plausible questions + 1–2 tool ids
derived from keywords in the description.

## 4. `extractSchedule` (used by chat + the schedule AI-assist)

Decides whether a message is a scheduling request and extracts the task.

```ts
const ExtractScheduleSchema = z.object({
  isSchedule: z.boolean(),
  title: z.string(),
  instructionsText: z.string(),                  // plain text; may contain "@AgentName"
  timing: z.object({
    frequency: z.enum(["daily","weekly","monthly"]),
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(28).optional(),
  }),
  agentId: z.string().nullable().optional(),     // if the user named one of their saved agents
});
```
System prompt: "Decide if the user is asking to schedule a recurring task. If so, set isSchedule
true and extract a short title, the task instructions, and the timing. If the user references one of
their saved agents by name, set agentId. Otherwise isSchedule false." Pass the user's saved agent
names/ids in the prompt so `agentId`/`@mentions` resolve.

**Mock / no-key fallback (deterministic regex):**
- `isSchedule` true if the text matches `/(every|each)\s+(day|morning|week|weekday|month|monday|…)/i`
  or `/(daily|weekly|monthly)\b/i` or `/\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?/i` combined with a
  recurrence word.
- Map matched words to `timing` (e.g. "every weekday at 8am" → daily 08:00; "every Monday" → weekly
  dow=1). Default minute 0. `title` = first ~6 words; `instructionsText` = the message.
- Else `isSchedule: false`.

## 5. Why tool-use instead of "return JSON in text"

Forcing `tool_choice: { type: "tool", name }` makes the model emit arguments that conform to
`input_schema`, so you parse `tool_use.input` directly — no brittle string/JSON extraction, no
markdown fences to strip. This is the recommended structured-output approach with the Anthropic SDK.

## Acceptance

- `renderQuestion` returns schema-valid `RenderedQuestion[]` with a key, and deterministic mock
  output without a key.
- `generateAgentDraft` returns a valid patch (incl. valid `toolIds`) the AgentForm can apply.
- `extractSchedule` flags scheduling phrases and returns valid `timing`; the regex fallback works
  with no key.
- Malformed model output never throws into the UI — it degrades to the mock.
