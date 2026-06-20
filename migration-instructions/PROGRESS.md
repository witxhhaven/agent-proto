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
  ⚠️ Spec changed: `/` must **no longer redirect to `/explore`** (home chat lives there now). The
  built `src/app/page.tsx` redirect will be removed when `home.md` is built (step below).
- [x] **data-models.md** — `src/types/index.ts` compiles. ⚠️ **Rework pending:** add `classification`/
  `saved`/`sharedWithYou`/`roleRecommended`/`historyRecommended` to `Assistant`, `DataClassification`
  type, and new `AgentTemplateId` set (qa-chatbot/meeting-minutes/email-reply/document-summariser).
- [x] **mock-data.md** — store hydrates with seeds. ⚠️ **Rework pending:** seed the new Assistant
  flags, the 4 screenshot templates, `toggleSaved` action, `createChat` default assistantName
  "My AI Assistant".
- [x] **app-shell.md** — collapsible sidebar + right drawer built. ⚠️ **Rework pending:** rebrand to
  GOVTECH Desk; new nav (New Chat top, New Project disabled, Connectors, Agent Marketplace, My
  Agents, Scheduled); Favourited Agents + Recent Chats sections; user profile footer; remove the
  Create-agent sidebar button.

### Features
- [ ] **home.md** — `/` welcome screen (greeting + shared Composer + classification note + 4 chips);
  chips prefill composer; first message creates+persists a chat and routes to it; blank chats never
  listed in the sidebar.
- [ ] **connectors.md** — static "coming soon" page with disabled integration placeholders.
- [ ] **explore.md** — Agent Marketplace: curated rows when idle, filtered grid on search/pill;
  cosmetic CCE/SN badge + favourite + "Save to My Agents"; "Start chat" navigates.
- [ ] **agents-list.md** — My Agents: Created by You / Saved Agents (N) tabs + "N/5 agents used"
  quota; "+ New Agent" opens the automate modal; row actions Edit/Test/Chat/Schedule/Delete.
- [ ] **agent-creation.md** — automate modal ("What would you like to automate?" + 4 templates +
  Start from scratch) → editor (Untitled Agent header, 7 Settings fields, ephemeral Test tab) →
  AI-assist drawer; save publishes.
- [ ] **intake-questions.md** — opening a chat with an intake agent runs the MCQ flow (LLM or mock);
  options + free text + Skip + Back; resumes after reload; summary posts on completion.
- [ ] **chat.md** — bubbles + intake + schedule-card kinds; shared Composer w/ cosmetic
  classification selector; scheduling phrase creates a ScheduledTask + inline ScheduleCard; persists.
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
- 2026-06-20: app-shell.md done — **Foundation checkpoint reached; paused for user review before Features.**
  Added common/iconMap.ts (resolveIcon/resolveBrandIcon, IconApps fallback) + common/AgentAvatar.tsx (reused
  across screens). Right drawer = context provider (useRightDrawer) over Mantine Drawer, withOverlay={false}.
  Sidebar collapse persisted via Mantine useLocalStorage (getInitialValueInEffect to avoid hydration mismatch);
  AppFrame keeps navbar visible-but-narrow (64px) on desktop when collapsed. Placeholder pages for /agents,
  /agents/new, /scheduled, /chat/[id] will be replaced in feature steps. Store useStore caveat: selectors must
  return state-owned refs/primitives (no new arrays) to avoid useSyncExternalStore loops.
- 2026-06-20: **Spec refinement from screenshots (`desk-srn-shots/`).** User confirmed GOVTECH Desk
  structure; rewrote app-shell/explore/agents-list/agent-creation/chat/conventions/data-models/mock-data/
  00-START-HERE specs and added features/home.md + features/connectors.md. Decisions captured in the
  `desk-structure-decisions` project memory (authoritative). Foundation items conventions/data-models/
  mock-data/app-shell re-opened with ⚠️ rework notes (rebuild order: data-models → mock-data → app-shell →
  home → connectors → explore → agents-list → agent-creation, then the unchanged intake/chat/scheduled/ai).
  Net-new fields: Assistant.classification/saved/sharedWithYou/roleRecommended/historyRecommended;
  store.toggleSaved; AgentTemplateId set changed. **Phase-1 (spec rewrite) only — no app code changed yet.**
