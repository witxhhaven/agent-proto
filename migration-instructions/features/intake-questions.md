# features/intake-questions.md — the interactive LLM intake flow (CENTERPIECE)

This is the most important feature and the main AI experiment: **take a raw question string the
creator wrote, run it through Claude, and get back a UI-renderable multiple-choice object.** It
runs at the **start of a chat** with an agent that has `questions[]`.

Depends on: store, chat view (`features/chat.md`), and the structured helper
(`ai/structured-output.md`). Build the mock path first; it works with no API key.

## Behavior overview

When a chat opens with an agent that has `questions.length > 0` and `chat.intakeComplete` is not
true, the chat enters **intake mode**:

1. Take the first `IntakeQuestion`. Call `renderQuestion(question, { priorAnswers })` →
   `RenderedQuestion[]` (the LLM produces options, may reword, and may **split one question into
   several sub-questions**). Often this is a single rendered question; sometimes 2–3 sub-questions.
2. Render each `RenderedQuestion` as an **MCQ card** (component below): the suggested options as
   selectable buttons, plus a free-text input, a **Skip**, and a **Back** control.
3. Record an `IntakeAnswer`. Advance to the next rendered/source question. **Back** returns to the
   previous answered question and lets the user change it.
4. When all questions are answered/skipped, write `chat.intakeComplete = true`, store
   `chat.intakeAnswers`, and post an **intake summary** assistant message that seeds the
   conversation (a short recap of what the user chose).

The flow is **resumable**: persist progress on the chat so a reload mid-intake continues where it
left off. Model state as messages with `kind: "intake-question"` plus a separate progress pointer,
OR a dedicated `intakeState` on the chat — your choice, but it must survive reload.

## The state machine — `src/components/chat/IntakeFlow.tsx`

Local state:
```ts
type IntakeStatus = "idle" | "generating" | "answering" | "error" | "complete";
interface IntakeState {
  sourceIndex: number;              // index into agent.questions
  queue: RenderedQuestion[];        // rendered questions still to ask (incl. sub-questions)
  current: RenderedQuestion | null;
  answers: IntakeAnswer[];
  status: IntakeStatus;
}
```
Loop:
- If `queue` is empty and more source questions remain → `generating`: call `renderQuestion` for
  `agent.questions[sourceIndex]`, push results into `queue`, `sourceIndex++`.
- Take `queue.shift()` as `current` → `answering`.
- On answer/skip → push `IntakeAnswer`, continue. On **Back** → pop the last answer, re-show that
  question (re-use the already-rendered object; don't re-call the LLM).
- When no source questions and empty queue → `complete`: persist + post summary.

Handle `generating` with a `LoadingState` ("Preparing your questions…") and `error` with an
`ErrorState` offering **Retry** and **Skip this question**. A failed LLM call must never dead-end
the chat.

## The MCQ card — `src/components/chat/IntakeQuestionCard.tsx`

Props: `{ question: RenderedQuestion; onAnswer(a: IntakeAnswer); onSkip(); onBack(); canGoBack }`.
- Render `question.prompt` (+ a "sub-question" hint if `subQuestionOf` is set).
- Options as a vertical list of selectable buttons (`UnstyledButton`/`Chip`). If
  `allowMultiple`, allow multi-select; else single-select.
- A free-text `TextInput`/`Textarea` ("Or type your own answer…"), always shown
  (`allowFreeText` is always true here).
- Footer buttons: **Back** (disabled when `!canGoBack`), **Skip**, **Continue** (enabled when an
  option is selected OR free text is non-empty).
- "Continue" builds the `IntakeAnswer` from selected option labels + free text.

Render these cards inline in the chat message stream (a message with
`kind: "intake-question"` renders the card; once answered, replace/append with the chosen answer as
a normal user message so history reads naturally).

## The LLM contract — `renderQuestion`

Implemented in `lib/structured.ts` (full prompt + schema in `ai/structured-output.md`). Signature:
```ts
renderQuestion(
  question: IntakeQuestion,
  ctx: { agentName: string; agentDescription: string; priorAnswers: IntakeAnswer[] }
): Promise<RenderedQuestion[]>
```
- Returns **1–3** `RenderedQuestion`s. Returns several only when splitting genuinely helps.
- Each has 2–6 concise `options`, `allowFreeText: true`, `allowMultiple` echoing the source hint.
- **Mock mode** (no key): synthesize 3 generic options from the prompt (e.g. "Yes", "No",
  "Not sure") + free text, as a single rendered question. Deterministic so the flow is testable.

## Acceptance

- Opening a chat with an agent that has questions starts intake automatically.
- Each question shows LLM-generated options (or mock options) + free text + Skip + Back.
- Back lets you change a prior answer without re-calling the LLM.
- At least one source question demonstrably splits into sub-questions when the prompt is broad
  (verify with the real key; mock mode may keep it single).
- Completing intake posts a summary and the chat continues normally.
- Reloading mid-intake resumes at the same question.
