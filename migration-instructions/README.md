# Agent Prototype — migration instructions

This folder is a **self-contained spec** for rebuilding the agent-marketplace flows of `aiap-desk`
as a lightweight, mock-data prototype in a **fresh project folder**. Copy this folder into the new
project and point Claude Code at it.

## How to use

1. Create/open an empty project folder.
2. Copy this `migration-instructions/` folder into it.
3. Tell Claude Code: **"Read `migration-instructions/00-START-HERE.md` and build the prototype,
   following the build order. Do one file at a time and verify each file's Acceptance section
   before moving on."**

## What gets built

A Next.js 16 + Mantine prototype with: Explore marketplace, My Agents, Scheduled, agent creation
with an AI-assist right drawer, and detail chats with an **LLM-powered interactive intake
questionnaire** (the centerpiece). All data is mock + `localStorage`; the only server code is one
LLM route handler. It runs fully on mock responses with **no API key**, and uses Claude Sonnet once
a key is added to `.env.local`.

## File index

| File | Purpose |
|------|---------|
| `00-START-HERE.md` | Read first — scope, stack, global rules, build order, done criteria |
| `foundation/conventions.md` | Scaffold + project conventions + store pattern |
| `foundation/data-models.md` | All TypeScript types |
| `foundation/mock-data.md` | Seed data + the localStorage store |
| `foundation/app-shell.md` | Collapsible sidebar + reusable right drawer |
| `features/explore.md` | Marketplace grid, filters, search |
| `features/agents-list.md` | My Agents list/table |
| `features/agent-creation.md` | Config form + AI-assist drawer |
| `features/intake-questions.md` | **LLM MCQ intake flow (centerpiece)** |
| `features/chat.md` | Detail chat view |
| `features/scheduled.md` | Scheduled agents + schedule builder |
| `ai/proxy-setup.md` | The Next.js LLM route handler (only backend) |
| `ai/structured-output.md` | Reusable text → typed JSON helper + schemas |

## Key decisions already made

- **Stack:** mirror the source app — Next.js 16 (App Router) + Mantine 8 + TypeScript. Color/visual
  styling does **not** need to match anything.
- **No backend** except one LLM route handler; persistence via `localStorage`.
- **Distilled, not ported** — CopilotKit, next-auth, OAuth connectors, and React Query are
  intentionally dropped and reimplemented simply.
- **AI:** Claude Sonnet (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`, structured output via forced
  tool-use, with a deterministic mock fallback so everything works before a key is supplied.
