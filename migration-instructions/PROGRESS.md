# PROGRESS.md — build state (single source of truth)

This file is the durable record of the build. **Claude updates it after every step** so the build
can resume in a fresh session after any interruption. On session start, read this file and continue
from the first unchecked item.

- `[ ]` not started · `[~]` in progress · `[x]` done & Acceptance verified · `[!]` blocked (see Notes)
- After finishing a step: tick it, jot anything non-obvious in **Notes**, and **commit** (see rule
  in `CLAUDE.md`). One commit per step = a durable checkpoint.

## Checklist (build in this order)

### Foundation
- [x] **conventions.md** — Next.js scaffolded into current folder; Mantine + deps installed; `/`
  redirects to `/explore`; `createId` + EmptyState/LoadingState/ErrorState compile. _(needs human flow-check)_
- [x] **data-models.md** — `src/types/index.ts` compiles; all types importable via `@/types`.
- [ ] **mock-data.md** — store hydrates with 2 agents, 2 scheduled tasks (incl. Biology newsletter),
  ~12 assistants, 15 tools, icon/color presets; mutations persist; `reset()` works; no SSR/hydration errors.
- [ ] **app-shell.md** — collapsible sidebar (state persists); active nav highlight; Chats section
  live; right drawer opens/closes from any page.

### Features
- [ ] **explore.md** — search + filter pills narrow the grid; favorite persists; "Start chat" navigates.
- [ ] **agents-list.md** — list with avatar/tools/status; Edit/Test/Chat/Schedule/Delete actions work.
- [ ] **agent-creation.md** — Settings tab (7 fields incl. icon/color picker, knowledge base,
  two-line tools dropdown, questions); Test tab is ephemeral; save publishes; AI-assist drawer applies.
- [ ] **intake-questions.md** — opening a chat with an intake agent runs the MCQ flow (LLM or mock);
  options + free text + Skip + Back; resumes after reload; summary posts on completion.
- [ ] **chat.md** — bubbles + intake + schedule-card kinds; scheduling phrase creates a ScheduledTask
  + inline ScheduleCard; messages persist.
- [ ] **scheduled.md** — ScheduleCard matches reference; manual + AI-assist create; "Test response now"
  ephemeral; mention pills; detail Settings + Log (expandable mock responses).

### AI
- [ ] **proxy-setup.md** — `POST /api/llm` returns `{mock:true}` with no key; real text + structured
  calls work with a key; key never reaches the browser.
- [ ] **structured-output.md** — `renderQuestion`, `generateAgentDraft`, `extractSchedule` return
  schema-valid output (real) and deterministic mock output (no key); bad output degrades to mock.

### Final verification
- [ ] `npm run build` passes with no type errors.
- [ ] Manual walkthrough of the whole-prototype "Definition of done" in `00-START-HERE.md`.
- [ ] No console errors on any route.

## Notes / decisions / blockers
<!-- Append dated entries here. Record assumptions made, anything deferred, and any [!] blockers
     with enough detail to resume cold. Example:
     - 2026-06-20: AgentMentionInput uses the textarea+token fallback (contenteditable was flaky). OK per spec.
-->
- 2026-06-20: Scaffold pulled **Next.js 16.2.9** (Turbopack) + **Mantine 9.3.2** (specs assumed Next 16 / Mantine 8;
  Mantine 9 used with defaults per "use Mantine defaults" rule). `create-next-app` refused to run in a folder
  containing CLAUDE.md/migration-instructions, so scaffolded into `scaffold-tmp/` and moved files up; kept the
  original CLAUDE.md (deleted the generated one). Scaffold's `AGENTS.md` kept (warns Next 16 has breaking changes;
  consult `node_modules/next/dist/docs/`).
- 2026-06-20: conventions.md done. layout.tsx kept minimal (MantineProvider + Notifications only); AppFrame +
  RightDrawerProvider wired in during app-shell step to keep each step's tsc green. lib/store.ts is an empty stub
  until mock-data step. theme = indigo primaryColor. Per-step local git commits (no GitHub remote).
