# PROGRESS.md — build state (single source of truth)

This file is the durable record of the build. **Claude updates it after every step** so the build
can resume in a fresh session after any interruption. On session start, read this file and continue
from the first unchecked item.

- `[ ]` not started · `[~]` in progress · `[x]` done & Acceptance verified · `[!]` blocked (see Notes)
- After finishing a step: tick it, jot anything non-obvious in **Notes**, and **commit** (see rule
  in `CLAUDE.md`). One commit per step = a durable checkpoint.

## Checklist (build in this order)

> **2026-06-20 structure refinement (from screenshots).** App = **GOVTECH Desk**. Specs rewritten
> for: home/welcome chat at `/`, new sidebar nav, cosmetic CCE/SN classification, automate-modal
> creation flow, My Agents tabs + quota, Connectors stub. Several already-`[x]` Foundation items now
> need **rework** — re-opened below. See the `desk-structure-decisions` memory + bottom Notes.

### Foundation
- [x] **conventions.md** — scaffolded; `createId` + EmptyState/LoadingState/ErrorState compile.
  `/` redirect removed (home chat lives there now). _(needs human flow-check)_
- [x] **data-models.md** — reworked: `DataClassification` + Assistant `classification`/`saved`/
  `sharedWithYou`/`roleRecommended`/`historyRecommended`; new `AgentTemplateId` set.
- [x] **mock-data.md** — reworked: screenshot assistants w/ new flags, 4 automate templates,
  `toggleSaved`, `createChat` default assistantName "My AI Assistant". _(needs human flow-check)_
- [x] **app-shell.md** — reworked to GOVTECH Desk: Desk (BETA) brand, new nav (New Chat top, New
  Project disabled, Connectors, Agent Marketplace, My Agents, Scheduled), Favourited Agents +
  Recent Chats, profile footer w/ reset, no Create-agent button. _(needs human flow-check)_

### Features
- [x] **home.md** — `/` welcome screen (greeting + shared Composer + classification note + 4 chips);
  chips prefill; first message creates+persists chat and routes; blank chats not listed. _(needs human flow-check)_
- [x] **connectors.md** — static "coming soon" page with disabled integration placeholders.
- [x] **explore.md** — Agent Marketplace: curated rows when idle, filtered grid on search/pill;
  CCE/SN badge + favourite + Save to My Agents; Start chat navigates. _(needs human flow-check)_
- [x] **agents-list.md** — My Agents: Created by You / Saved Agents (N) tabs + N/5 quota; New Agent
  opens automate modal; row actions Edit/Test/Chat/Schedule/Delete + confirm. _(needs human flow-check)_
- [x] **agent-creation.md** — automate modal (4 templates + scratch) → editor (Untitled Agent header,
  7 Settings fields, ephemeral Test tab) → AI-assist drawer; save publishes. _(needs human flow-check)_
- [x] **intake-questions.md** — chat with intake agent runs MCQ flow (LLM/mock); options + free text +
  Skip + Back; resumes via persisted intakeAnswers; summary posts on completion. _(needs human flow-check)_
- [x] **chat.md** — bubbles + intake + schedule-card kinds; shared Composer w/ cosmetic classification;
  scheduling phrase creates ScheduledTask + inline ScheduleCard; persists. _(needs human flow-check)_
- [x] **scheduled.md** — ScheduleCard (reused in chat + listing); manual + AI-assist create; ephemeral
  "Test response now"; @mention pills; detail Settings + Log (expandable responses, Run now). _(needs human flow-check)_

### AI
- [x] **proxy-setup.md** — `POST /api/llm` returns `{mock:true}` with no key; text/structured with key;
  key server-side only (never in client bundle). _(needs human flow-check with a real key)_
- [x] **structured-output.md** — `generateStructured` + `renderQuestion`/`generateAgentDraft`/
  `extractSchedule`, zod-validated, deterministic mock fallbacks; bad output degrades to mock.

### Final verification
- [x] `npm run build` passes with no type errors.
- [ ] Manual walkthrough of the whole-prototype "Definition of done" in `00-START-HERE.md`. _(human flow-check)_
- [ ] No console errors on any route. _(human flow-check — `npm run dev` and click through)_

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
- 2026-06-20: app-shell.md done — **Foundation checkpoint reached; paused for user review before Features.**
  Added common/iconMap.ts (resolveIcon/resolveBrandIcon, IconApps fallback) + common/AgentAvatar.tsx (reused
  across screens). Right drawer = context provider (useRightDrawer) over Mantine Drawer, withOverlay={false}.
  Sidebar collapse persisted via Mantine useLocalStorage (getInitialValueInEffect to avoid hydration mismatch);
  AppFrame keeps navbar visible-but-narrow (64px) on desktop when collapsed. Placeholder pages for /agents,
  /agents/new, /scheduled, /chat/[id] will be replaced in feature steps. Store useStore caveat: selectors must
  return state-owned refs/primitives (no new arrays) to avoid useSyncExternalStore loops.
- 2026-06-20: **All build steps complete — `npm run build` + `npx tsc --noEmit` pass.** Whole
  prototype implemented per the refined GOVTECH Desk specs. Remaining items are human flow-checks
  (click-through + optional real-key test) — Claude cannot click the UI. Notable choices:
  AppFrame drops the desktop top bar (mobile burger only); shared `components/chat/Composer.tsx`
  reused by home + chat; IntakeFlow resumes from persisted `chat.intakeAnswers`; AgentMentionInput
  uses the textarea+token fallback (pills rendered in a preview); scheduled detail uses conditional
  render instead of Mantine `Collapse` (Mantine 9 `in` prop mismatch). `permissions.defaultMode:auto`
  set in project settings for hands-off building.
- 2026-06-20: **Spec refinement from screenshots (`desk-srn-shots/`).** User confirmed GOVTECH Desk
  structure; rewrote app-shell/explore/agents-list/agent-creation/chat/conventions/data-models/mock-data/
  00-START-HERE specs and added features/home.md + features/connectors.md. Decisions captured in the
  `desk-structure-decisions` project memory (authoritative). Foundation items conventions/data-models/
  mock-data/app-shell re-opened with ⚠️ rework notes (rebuild order: data-models → mock-data → app-shell →
  home → connectors → explore → agents-list → agent-creation, then the unchanged intake/chat/scheduled/ai).
  Net-new fields: Assistant.classification/saved/sharedWithYou/roleRecommended/historyRecommended;
  store.toggleSaved; AgentTemplateId set changed. **Phase-1 (spec rewrite) only — no app code changed yet.**
