# features/home.md — home / welcome chat (landing screen)

Route: `src/app/page.tsx` (the app root `/`). This is the **first thing the user sees** when they
enter the prototype. See `desk-srn-shots/main-chat.png`. Depends on store, app shell, the shared
`Composer` (`features/chat.md`), and `lib/llm.ts` (mock/real).

> **`/` no longer redirects to `/explore`.** Remove that redirect (added in `conventions.md`); the
> root now renders this welcome screen.

## Behavior model (ChatGPT-style)

- The home screen is a **blank, general-assistant** starting point — it is NOT bound to any agent
  and is NOT itself a stored `Chat`. No chat row exists yet.
- Clicking **New Chat** in the sidebar simply routes back to `/` (this blank welcome state).
- A `Chat` is **created and persisted only when the user sends the first message.** At that moment:
  1. `store.actions.createChat({ agentId: null, title: <derived from first message>,
     assistantName: "My AI Assistant" })`.
  2. `store.actions.appendMessage(chat.id, { role: "user", text })`.
  3. `router.push('/chat/' + chat.id)` — the conversation continues in the normal chat view, and the
     chat now appears under **Recent Chats** in the sidebar.
  4. The assistant reply is produced there via the same mock/real path as `features/chat.md`.
- Therefore **blank chats never appear in the sidebar** — only chats with at least one message.
  (Ensure `createChat` is called on first-send, not on page load. If `createChat` is also used
  elsewhere eagerly, the sidebar Recent Chats list must filter to `messages.length > 0`.)

## UI

Centered column over the app's gradient-ish background:

- **Greeting:** large heading **"Good Afternoon, Alvin"** — hardcode the name "Alvin". Pick the
  greeting word (Good Morning/Afternoon/Evening) from the local hour; a fixed "Good Afternoon" is an
  acceptable fallback.
- **Composer:** the shared `Composer` ("Ask me anything…") with the attach icon + cosmetic
  classification selector + send button.
- **Classification note** under the composer (muted): "Supports data classification up to
  **Confidential (Cloud-Eligible)** / **Sensitive Normal (C(CE)/SN)**".
- **Suggestion chips** below: four `Button`/`Chip` items — **"Help me draft a document"**,
  **"Summarise this content"**, **"Create a project plan"**, **"Analyse data trends"**.
  - Clicking a chip **prefills the composer** with that text and focuses it (it does NOT auto-send).
    The user can edit, then Send → triggers the first-message flow above.

## States

- **Loading:** gate first paint on the store `hydrated` flag (avoid hydration flicker).
- No empty/error states needed beyond that — this screen is always available.

## Acceptance

- `/` renders the welcome screen (greeting + composer + classification note + 4 chips), not Explore.
- Clicking a suggestion chip fills the composer with that prompt; nothing is sent yet.
- Sending the first message creates+persists a chat, navigates to `/chat/[id]`, and the chat then
  appears under Recent Chats (titled from the message). Reloading preserves it.
- A brand-new visit (or clicking New Chat) shows a blank welcome with no chat row created.
