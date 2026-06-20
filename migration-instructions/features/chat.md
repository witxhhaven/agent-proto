# features/chat.md — detail chat view

Route: `src/app/chat/[id]/page.tsx`. Depends on store, app shell, and `IntakeFlow`
(`features/intake-questions.md`).

## UI — `src/components/chat/ChatView.tsx`

- Load the `Chat` by id from the store; if missing → `EmptyState` ("Chat not found", link to Explore).
- Header: chat title + assistant name + a `Badge` for the linked agent (if any).
- **Message list** (`MessageList`): render `messages` in order.
  - `kind: "text"` / undefined → a chat bubble (user right, assistant left). Render assistant
    markdown lightly (a simple renderer is fine; no need for the source app's markdown-it).
  - `kind: "intake-question"` → render the `IntakeQuestionCard` (handled by `IntakeFlow`).
  - `kind: "intake-summary"` → a styled recap block.
  - `kind: "schedule-card"` → render the **`ScheduleCard`** (`features/scheduled.md`, `compact`)
    for the `scheduledTaskId`. This is how a chat-created schedule appears inline.
- **Composer** (`Composer`): `Textarea` + Send. Disabled while intake is active (the user answers
  via the MCQ cards until intake completes).

## Intake integration

On mount, if the chat is linked to an agent (`chat.agentId`) that has `questions.length > 0` and
`!chat.intakeComplete`, mount `<IntakeFlow agent={agent} chat={chat} />` which drives the flow and
persists answers. Once complete, the normal composer is enabled.

## Assistant replies (mock)

This is a prototype — real conversational quality isn't the goal. After intake (or for generic
chats), when the user sends a message, produce an assistant reply via **one of**:
- **Mock (default):** a canned, context-aware stub ("Here's what I'd do based on your answers: …"
  echoing a couple of intake answers).
- **Real (if key present):** call `lib/llm.ts` `complete(messages)` → `/api/llm` for a genuine
  reply. Keep this optional and behind the same mock-fallback pattern.

Persist every message with `store.actions.appendMessage`.

## Create a schedule from chat (LLM extraction)

Before producing a normal reply, check whether the user's message is a **schedule request**.

- **Detection + extraction:** call `extractSchedule(message)` (`ai/structured-output.md`). It returns
  `{ isSchedule: boolean, title, instructionsText, timing, agentId? }`.
  - **With a key:** Claude decides if it's a schedule request and extracts the timing/task.
  - **Without a key (mock/fallback):** a regex flags phrases like `every (day|week|month|morning…)`,
    `each (day|week)`, `remind me … every`, or an explicit `daily/weekly/monthly at <time>`, and maps
    to a default timing. If nothing matches, `isSchedule: false`.
- **When `isSchedule` is true:**
  1. Convert `instructionsText` → `InstructionContent` via `plainTextToInstruction(text, agents)` so
     any mentioned saved agent becomes a pill.
  2. `store.actions.createScheduledTask({ title, instructions, agentId: agentId ?? null, timing,
     enabled: true, origin: "chat" })`.
  3. Append an assistant message with `kind: "schedule-card"` and the new `scheduledTaskId`. The
     `ScheduleCard` renders inline; its Edit/kebab opens the same schedule detail form.
- Otherwise, fall through to the normal mock/real assistant reply above.

## States

- **Loading:** first paint gated on store `hydrated`.
- **Error:** if an assistant LLM reply fails, show an inline retry affordance; never lose the user's
  message.

## Acceptance

- A chat with an intake-bearing agent runs the MCQ flow first, then a normal conversation.
- A generic chat (no agent / no questions) goes straight to free chat.
- Typing a scheduling phrase (e.g. "send me a news digest every weekday at 8am") creates a
  `ScheduledTask` and renders a `ScheduleCard` inline; it also appears on the Scheduled page.
- Messages persist across reload; the composer is correctly disabled during intake.
