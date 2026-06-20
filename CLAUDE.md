# CLAUDE.md — agent prototype build rules

> **Placement:** copy this file to the **root** of the new prototype project (next to `package.json`)
> so Claude Code auto-loads it every session. Keep the `migration-instructions/` folder in the
> project too — this file points at it.

## What we're building

A clickable **prototype** of an AI agent marketplace + agent builder, using **mock data only**.
The full spec is in `migration-instructions/`. **Start at `migration-instructions/00-START-HERE.md`**
and build in the order listed there; verify each file's **Acceptance** section before moving on.

Scope: Explore marketplace · My Agents · Agent creation (Settings form + ephemeral Test tab) ·
Scheduled tasks (wrap an agent or standalone; created via form, AI-assist, or from chat) · detail
chat with an LLM-powered MCQ intake flow · collapsible sidebar + reusable right drawer.

## Non-negotiable rules (do not break, even mid-build)

1. **No real backend.** Persist everything in `localStorage` via the store in
   `foundation/mock-data.md`. The only server code is the LLM route handler `app/api/llm/route.ts`.
2. **Never call Anthropic from the browser.** All LLM calls go through `POST /api/llm`. No component
   imports `@anthropic-ai/sdk` directly.
3. **Mock-first AI.** Every LLM feature must work with a deterministic **mock** when
   `ANTHROPIC_API_KEY` is absent, and switch to the real Claude Sonnet call when present. Nothing
   crashes without a key.
4. **Distill, don't port.** Do NOT add CopilotKit, next-auth, OAuth connectors, or React Query.
   Reimplement intent cleanly with Mantine + the local store.
5. **Stack:** Next.js (App Router) + Mantine + TypeScript (strict). Styling/colors do **not** need to
   match anything — use Mantine defaults.
6. **Polished scope:** every screen has empty, loading, and error states; all mutations persist
   across reload. Test-tab chats and "Test response now" are **ephemeral** (never written to the
   store).
7. **State:** a single `useSyncExternalStore` + `localStorage` store. No Redux/Zustand/React Query.

## Working agreement

- Build one spec file at a time; run `npm run dev` and check Acceptance before the next.
- Prefer Mantine props over raw CSS; CSS Modules only for hover/animation.
- When a detail is unspecified, choose the simplest thing that makes the flow demonstrable, and note
  the assumption.

## Progress tracking & resuming (IMPORTANT)

`migration-instructions/PROGRESS.md` is the single source of truth for build state.

1. **On every session start:** read `PROGRESS.md` first. Resume from the first item that is not
   `[x]`. Do not restart completed work.
2. **What "done" means per step:** you (Claude) only verify what is machine-checkable —
   `npx tsc --noEmit` and `npm run build` pass and the dev server starts with no errors. You cannot
   click through the UI, so do NOT claim a flow "works"; just confirm it compiles and the spec is
   implemented. Mark such a step `[x]` and note "needs human flow-check" if it has interactive
   behavior. After marking it, **commit**: `git add -A && git commit -m "build: <step name>"`. One
   commit per step = a durable checkpoint that survives a closed laptop.
3. **If blocked:** mark the item `[!]`, write the blocker under **Notes** with enough detail to
   resume cold, and ask the user. Do not silently skip.
4. **Do not stop until every item is `[x]`** (or genuinely blocked). "Looks mostly done" is not done
   — the build is complete only when the Final verification items pass.
5. Keep going across steps without waiting for permission, except at the explicit checkpoint the
   user names in their kickoff prompt.
