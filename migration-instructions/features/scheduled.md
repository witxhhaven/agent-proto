# features/scheduled.md — scheduled tasks (page + card + chat-created)

Schedules are a **first-class entity** (`ScheduledTask`). They can **wrap a saved agent** or be a
**lightweight standalone task**, and can be created from the **Schedule page** (manual or AI) or
**from any chat** (LLM extraction — see `features/chat.md`). Depends on store, app shell, presets,
agents (for mentions), and the AI helpers (mock fallback).

## 1. Schedule helpers — `src/lib/cron.ts`

```ts
describeTiming(t: ScheduleTiming): string   // "Daily at 10:00", "Weekly on Mon at 09:00", "Monthly on day 15 at 10:00"
toCron(t: ScheduleTiming): string           // 5-field cron, display only
nextRun(t: ScheduleTiming, from?: Date): Date
```
Nothing executes cron — it's for display realism only.

## 2. ScheduleCard — `src/components/scheduled/ScheduleCard.tsx`  (REUSED in chat + listing)

Matches the reference image. Layout:
- **Left:** small round clock/history icon (`IconHistory`/`IconClockHour10`) on a tinted circle.
- **Body:**
  - Line 1 (muted, small): timing label + an info `Tooltip` icon — e.g. `describeTiming(timing)`.
  - Line 2 (bold): `title`.
  - Line 3 (muted, truncated 1 line): the task description = `instructionToPlainText(instructions)`
    (or the wrapped agent's description).
- **Right:** an `enabled` `Switch` (`toggleScheduledTaskEnabled`) + a kebab `Menu`
  (Edit, Run now → `runScheduledTaskNow`, View log, Delete).
- Clicking the card body → open the schedule detail (section 5). Props:
  `{ task: ScheduledTask; onOpen?; compact? }`. `compact` is used for the inline-in-chat variant.

## 3. Schedule page — `src/app/scheduled/page.tsx`

- Header: "Scheduled" + **"New schedule"** button (opens the creation flow, section 4).
- A list/table of `ScheduledTask`s rendered as `ScheduleCard`s.
- **Empty state** when none.

## 4. Creating a schedule — `src/components/scheduled/ScheduleCreate.tsx`

Two paths in one modal/page, like agent creation:
- **AI assist:** a prompt box ("Describe what to run and when…"). On submit call
  `extractSchedule(prompt)` (see `ai/structured-output.md`) → returns `{ title, instructionsText,
  timing, agentId? }`. Pre-fill the manual form with the result. Mock fallback derives a daily 09:00
  task from the text without a key.
- **Manual form** — `ScheduleForm` (section 5).
- **"Test response now"** button (EPHEMERAL): generates a mock response (or a real `/api/llm` call
  with a key) and shows it inline; **not** saved to `runHistory`.
- **Save** → `createScheduledTask` (+ toast). After saving, show the new `ScheduleCard` (this is the
  same component shown inline after chat creation).

## 5. Schedule detail + form — `src/app/scheduled/[id]/page.tsx`

Tabbed: **Settings** (the form) and **Log**.

### ScheduleForm (Settings) — lightweight
Fields:
1. **Title** — `TextInput`.
2. **Mode** — segmented control: *Standalone task* vs *Use a saved agent*.
   - *Use a saved agent* → `Select` of the user's agents; sets `agentId`. The instructions field can
     be hidden or used as extra guidance.
3. **Instructions** — `AgentMentionInput` (section 6): rich text where the user can `@`-mention
   saved agents, rendered as **pills (avatar + name)**. Stored as `InstructionContent` segments.
4. **Knowledge file reference** — optional single file name (mock chip), `knowledgeFileRef`.
5. **Schedule timing** — `ScheduleBuilder` (section 7).
Footer: **Save** (`updateScheduledTask`), **Delete**.

### Log tab
- Render `runHistory` newest-first: each row shows time, status `Badge`, source, duration.
- **Expandable response:** a "View response" toggle reveals the mock `response` text
  (`Collapse`/`Accordion`). "Run now" (`runScheduledTaskNow`) prepends a new entry with a mock
  response so the user sees the log grow.

## 6. AgentMentionInput — `src/components/scheduled/AgentMentionInput.tsx`

A mention-enabled text field for the schedule instructions:
- Typing `@` opens a popover listing saved `agents`; selecting one inserts an **agent pill**
  (small avatar with the agent's `iconName`/`bgColor` + name). Backspacing a pill removes it.
- Output value is `InstructionContent` (`InstructionSegment[]`). Provide
  `instructionToPlainText()` for display/LLM and `plainTextToInstruction(text, agents)` to convert
  AI-returned plain text (with `@AgentName`) back into segments.
- Implementation: a Mantine `Combobox`-driven contenteditable, OR (simpler, acceptable) a styled
  `Textarea` plus an "Add agent" button that appends an `@AgentName` token mapped to a pill on
  render. Prefer whichever you can make reliable; the pill rendering is the must-have.

## 7. ScheduleBuilder — `src/components/scheduled/ScheduleBuilder.tsx`

`{ value: ScheduleTiming; onChange }`: frequency `Select` (Daily/Weekly/Monthly), time
(`TimeInput`), weekly → day-of-week, monthly → day-of-month (1–28). Live preview via `describeTiming`
+ `nextRun`.

## Acceptance

- The Scheduled page lists seed tasks (incl. "Daily Biology and Geology Newsletter") as
  `ScheduleCard`s matching the reference layout (timing line + info, title, truncated description,
  toggle, kebab).
- AI-assist pre-fills the form from a prompt; manual editing works; "Test response now" shows a mock
  response without writing to history.
- Standalone instructions support `@`-mention agent pills; "Use a saved agent" mode sets `agentId`.
- Detail page Settings edits persist; Log tab shows runs and expands to reveal mock responses; "Run
  now" adds a log entry.
- The **same** `ScheduleCard` appears inline in chat after a chat-created schedule (see chat.md).
