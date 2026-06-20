# features/explore.md — Agent Marketplace

Route: `src/app/explore/page.tsx` (keep the `/explore` path; the **nav label is "Agent
Marketplace"**). Depends on store + app shell. See `desk-srn-shots/agent marketplace.png`.

## UI

- **Header:** title "Agent Marketplace" + a one-line description ("Discover ready-made agents for
  everyday work…").
- **Search:** a full-width search `TextInput` ("Search assistants by name, description, or tag",
  debounced).
- **Filter pills:** Mantine `Chip.Group` (single select): `Recommended` (default), `Favourited`,
  `Shared with you`, then each `AssistantCategory` (Writing, Research, Data & Analytics,
  Productivity).
- **Body — two modes:**
  - **Idle (pill = `Recommended`, no search text):** show **curated rows** instead of one flat grid.
    Each row = a section header + a horizontal/`SimpleGrid` strip of `AssistantCard`:
    - **"Based on your role"** — a curated subset (use a `roleRecommended` flag or just the first N).
    - **"Based on your chat history"** — another curated subset.
    Curated membership is mock — pick a deterministic split of the seed assistants.
  - **Active (any search text, or any pill other than `Recommended`):** collapse to a single
    responsive `SimpleGrid` of all matching `AssistantCard`s.
- `Favourited` pill filters to `favorited === true`; `Shared with you` filters to a mock
  `sharedWithYou` flag.

## `src/components/explore/AssistantCard.tsx`

Mantine `Card` showing (top row): resolved icon (via `iconMap`), a **cosmetic `CCE/SN`
classification `Badge`** (see below), and a favorite heart `ActionIcon` (filled when `favorited`,
toggles `store.actions.toggleFavorite`). Body: name + truncated description. Footer action
**"Save to My Agents"** (the screenshot's primary button) which adds the assistant to the user's
saved agents (`store.actions.saveToMyAgents` / toggles a `saved` flag) — on the My Agents "Saved
Agents" tab this same card shows **"Remove from My Agents"** instead.

> **Classification badge is cosmetic only.** Render `assistant.classification` (default `"CCE/SN"`)
> as a small `Badge`. No filtering or enforcement logic anywhere.

Cards also support **"Start chat"** (secondary, e.g. on click of the card body):

```ts
const chat = store.actions.createChat({
  agentId: assistant.isOwned ? assistant.id : null,
  title: `Chat with ${assistant.name}`,
  assistantName: assistant.name,
});
router.push(`/chat/${chat.id}`);
```

> If the assistant is an owned agent **with intake questions**, the chat view (see
> `features/chat.md`) will automatically launch the intake flow — no special handling needed here.

## States

- **Loading:** the store is synchronous, but render a `LoadingState` on the very first client mount
  if you gate on a `hydrated` flag (avoids hydration flicker).
- **Empty:** when search/filter yields nothing → `EmptyState` ("No assistants match", with a
  "Clear filters" action).

## Acceptance

- Idle state shows the curated "Based on your role" / "Based on your chat history" rows;
  searching or selecting any non-`Recommended` pill collapses to a single filtered grid.
- Search and each filter pill correctly narrow the grid.
- Each card shows a cosmetic `CCE/SN` badge + favourite heart.
- "Save to My Agents" adds the assistant to the Saved Agents tab (and reflects as
  "Remove from My Agents" there); the change persists across reload.
- Favoriting persists across reload, surfaces in the sidebar Favourited Agents section, and the
  "Favourited" pill reflects it.
- "Start chat" creates a chat, navigates to `/chat/[id]`, and the chat appears in the sidebar.
