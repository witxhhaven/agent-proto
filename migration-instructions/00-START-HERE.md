# 00 — START HERE (read this first)

You are building a **clickable prototype** of an AI agent marketplace + agent builder. It is a
throwaway design prototype to test flows, **not** a production app. Build it with **mock data and
local persistence only** — there is no real backend except one thin LLM proxy route (see `ai/`).

## What this prototype covers

1. **Explore / marketplace** — browse agents ("assistants"), filter, search, start a chat.
2. **My Agents** — list of agents the user created; enable/disable, edit, test, chat, delete, and
   "Schedule this agent".
3. **Agent creation** — a **Settings** tab (form: Name, icon + BG color, knowledge base, instructions,
   MCP tools dropdown, intake questions) and a **Test** tab (ephemeral chat). Saving publishes the
   agent immediately. An **AI-assist right drawer** drafts the settings + questions.
4. **Scheduled tasks** — a first-class entity that can **wrap a saved agent** or be a **lightweight
   standalone task**. Created from the Schedule page (manual or AI-assist), or **from any chat** via
   LLM extraction of phrases like "every weekday at 8am". A reusable **ScheduleCard** appears both in
   chat (right after creation) and in the listing. Detail = Settings form + a Log of mock runs with
   expandable responses.
5. **Detail chat** — chatting with an agent. When an agent defines intake questions, the chat
   opens with an **interactive MCQ intake flow** (the centerpiece — see
   `features/intake-questions.md`).
6. **App skeleton** — collapsible left sidebar + a reusable right drawer.
7. **The real AI features** — turn raw text into structured objects the UI renders, via Claude Sonnet
   behind a Next.js route handler: (a) intake question → MCQ, (b) description → agent draft, (c) chat
   message → scheduled task. All have deterministic mock fallbacks (work with no key).

## Stack (mirror the source app, minus backend cruft)

- **Next.js 16** (App Router) + **TypeScript**
- **Mantine 8** for all UI components (color/styling does NOT need to match anything — use Mantine
  defaults freely)
- **localStorage** for persistence (no database, no auth, no React Query, no CopilotKit, no OAuth)
- **`@anthropic-ai/sdk`** called only from a Next.js route handler (`app/api/llm/route.ts`)

## Global rules (apply to every file)

1. **No real backend.** Persist everything in `localStorage` through the store in
   `foundation/mock-data.md`. The only server code is the LLM proxy in `ai/`.
2. **Never call Anthropic from the browser.** All LLM calls go through `POST /api/llm`.
3. **Distill, don't port.** Do not copy CopilotKit, next-auth, OAuth connectors, or React Query
   from the source app. Reimplement the *intent* cleanly with Mantine + the local store.
4. **Mock-first AI.** Every LLM-backed feature must work with a deterministic **mock response**
   when `ANTHROPIC_API_KEY` is absent, and switch to the real call when it is present. The user
   will add a key later — nothing should hard-crash without it.
5. **Polished scope.** Every screen needs empty, loading, and error states. Mutations (create /
   save / schedule / delete) update the store and survive a page reload.
6. **Prefer Mantine props** over raw CSS. Use CSS Modules only for hover/animation states.
7. **TypeScript strict.** No `any` in app code except where a third-party type forces it.

## Build order (do NOT reorder)

Build one file at a time. After each, run `npm run dev` and verify that file's **Acceptance**
section before moving on.

> **Structure note:** the app is **GOVTECH Desk**. See `desk-srn-shots/` for the layout reference
> and the `desk-structure-decisions` project memory for the confirmed structure (home/welcome chat
> at `/`, GovTech sidebar nav, cosmetic CCE/SN classification, automate-modal creation flow, My
> Agents tabs + quota). The `.md` specs below are authoritative for data/behavior.

1. `foundation/conventions.md` — scaffold + project conventions
2. `foundation/data-models.md` — all TypeScript types
3. `foundation/mock-data.md` — seed data + the localStorage store
4. `foundation/app-shell.md` — GOVTECH Desk sidebar (New Chat, Connectors, Agent Marketplace, My
   Agents, Scheduled, Favourited Agents, Recent Chats) + right drawer skeleton
5. `features/home.md` — `/` welcome chat (greeting + composer + chips); the landing screen
6. `features/connectors.md` — static "coming soon" page
7. `features/explore.md` — Agent Marketplace (curated rows + filtered grid)
8. `features/agents-list.md` — My Agents (Created by You / Saved Agents tabs + quota)
9. `features/agent-creation.md` — automate modal → editor → AI-assist
10. `features/intake-questions.md`  ← the AI centerpiece
11. `features/chat.md`
12. `features/scheduled.md`
13. `ai/proxy-setup.md` — the Next.js LLM route (can be built earlier if you want intake to call
    real LLM during step 10; a mock is provided either way)
14. `ai/structured-output.md` — the reusable "text → typed JSON" helper

> Steps 13–14 are listed last for reading order, but `intake-questions.md` (step 10) depends on the
> `generateStructured` helper from step 14 and the route from step 13. Build the **mock** versions
> of those helpers first (they are fully specified in the `ai/` files), then upgrade to real calls.

## Definition of done (whole prototype)

- Entering the prototype lands on the **home/welcome chat** at `/` ("Good Afternoon, Alvin" +
  composer + chips); sending the first message creates a persisted chat that appears in Recent Chats.
- All routes navigable from the GOVTECH Desk sidebar with no console errors.
- Create an agent via the automate modal (template or scratch; icon/color, knowledge base, tools,
  questions — with AI-assist), see it in My Agents (Created by You) + the Agent Marketplace, test it
  in the Test tab, then chat with it for real.
- Starting a chat with an agent that has intake questions runs the MCQ flow with LLM-generated
  options (or mock options without a key).
- Create a schedule three ways — manual form, AI-assist prompt, and from a chat message — and see the
  same `ScheduleCard`; open its Log to view mock run responses.
- Reloading the page preserves created agents, scheduled tasks, and chats.

When in doubt, prefer the simplest thing that makes the flow demonstrable.
