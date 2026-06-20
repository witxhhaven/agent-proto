# foundation/conventions.md — scaffold + conventions

Build this first. It establishes the project and the patterns every later file assumes.

## 1. Scaffold

Scaffold **into the current folder** (the one that already holds `migration-instructions/` and
`CLAUDE.md`). The `.` target keeps everything in one project — do NOT create a nested subfolder.
`create-next-app` leaves the existing `migration-instructions/` and `CLAUDE.md` untouched (they are
not conflicting files).

```bash
npx create-next-app@latest . --typescript --app --eslint --no-tailwind --src-dir --import-alias "@/*"
npm install @mantine/core @mantine/hooks @mantine/dates @mantine/notifications @tabler/icons-react
npm install @anthropic-ai/sdk zod
```

> If `create-next-app` refuses because the directory "has files that could conflict", it means a
> real conflict (e.g. an existing `package.json`) — only `migration-instructions/` and `CLAUDE.md`
> should be present in a fresh folder, which do not conflict. Tailwind is intentionally omitted — we
> style with Mantine. `@tabler/icons-react` replaces the Lucide icons from the source app.

## 2. Mantine setup

- Wrap the app in `MantineProvider` + `Notifications` in `src/app/layout.tsx`.
- Import `@mantine/core/styles.css`, `@mantine/notifications/styles.css`, `@mantine/dates/styles.css`.
- Add the Mantine `ColorSchemeScript` in `<head>`.
- Use a **default theme** — do not try to match any brand colors. A neutral primaryColor like
  `"indigo"` is fine.

## 3. Directory layout

```
src/
  app/
    layout.tsx                 ← MantineProvider + AppShell
    page.tsx                   ← HOME / welcome chat (features/home.md) — NOT a redirect
    explore/page.tsx           ← Agent Marketplace
    connectors/page.tsx        ← static "coming soon" page
    agents/page.tsx
    agents/new/page.tsx
    agents/[id]/page.tsx       ← agent detail / edit
    scheduled/page.tsx
    chat/[id]/page.tsx
    api/llm/route.ts           ← the ONLY server code (see ai/proxy-setup.md)
  components/
    shell/                     ← Sidebar, RightDrawer, AppFrame
    explore/                   ← ExploreGrid, AssistantCard
    agents/                    ← AgentList, AgentForm, QuestionsEditor, AiAssistDrawer
    chat/                      ← ChatView, MessageList, Composer, IntakeFlow, IntakeQuestionCard
    scheduled/                 ← ScheduledList, ScheduleBuilder
    common/                    ← EmptyState, LoadingState, ErrorState
  lib/
    store.ts                   ← localStorage-backed store (see foundation/mock-data.md)
    llm.ts                     ← client helper that POSTs to /api/llm (see ai/)
    structured.ts              ← generateStructured() + zod schemas (see ai/)
    id.ts                      ← createId()
    cron.ts                    ← schedule helpers (see features/scheduled.md)
  data/
    mockAssistants.ts          ← marketplace seed
    mockAgents.ts              ← created-agents seed
  types/
    index.ts                   ← all types (see foundation/data-models.md)
```

## 4. State & persistence pattern (IMPORTANT — use this everywhere)

Do **not** add React Query, Redux, or Zustand. Use a tiny store built on `useSyncExternalStore`,
backed by `localStorage`. The full implementation is in `foundation/mock-data.md`. The contract:

- `useStore(selector)` — read a slice, re-render on change.
- `store.actions.*` — typed mutations that update state and write to `localStorage`.
- All persisted keys are namespaced `prototype:*`.
- A `store.actions.reset()` re-seeds from `src/data/*` (useful for demos).

## 5. Conventions

- **IDs:** `createId(prefix)` → `` `${prefix}_${crypto.randomUUID().slice(0,8)}` ``. Put in `lib/id.ts`.
- **Dates:** store ISO strings; format for display with `Intl.DateTimeFormat`.
- **Navigation:** use `next/navigation` `useRouter().push(...)`. Sidebar links use `Link`.
- **Toasts:** use `@mantine/notifications` `notifications.show(...)` for save/delete feedback.
- **Loading/empty/error:** use the shared components in `components/common/`. Never leave a blank
  screen — every list and async area renders one of these three.
- **LLM access:** client code calls helpers in `lib/llm.ts` / `lib/structured.ts` only. Those POST
  to `/api/llm`. No component imports `@anthropic-ai/sdk` directly.

## 6. Common components to create now

`components/common/EmptyState.tsx`, `LoadingState.tsx`, `ErrorState.tsx` — each a small Mantine
`Stack` centered with an icon, a title, an optional description, and an optional action button.
Props: `{ icon?, title, description?, action? }`.

## Acceptance

- `npm run dev` serves a Mantine-themed page at `/`. (The home/welcome screen is built later in
  `features/home.md`; until then `/` may render a placeholder, but it must **not** redirect to
  `/explore`.)
- `createId`, the three common components, and an empty `lib/store.ts` stub compile with no TS errors.
