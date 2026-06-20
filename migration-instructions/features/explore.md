# features/explore.md — marketplace

Route: `src/app/explore/page.tsx`. Depends on store + app shell.

## UI

- **Header row:** title "Explore", a search `TextInput` (filter by name/description, debounced).
- **Filter pills:** Mantine `Chip.Group` (single select) with: `Recommended` (default, = all),
  `Favourited`, then each `AssistantCategory`. Filter the grid by the active pill.
- **Grid:** responsive `SimpleGrid` of `AssistantCard` for the filtered `assistants` from the store.

## `src/components/explore/AssistantCard.tsx`

Mantine `Card` showing: resolved icon (via `iconMap`), name, truncated description, owner, a
`Badge` for `type`, `uses` formatted (`13.5k`), and a favorite `ActionIcon` (filled when
`favorited`, toggles `store.actions.toggleFavorite`). Primary action **"Start chat"**:

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

- Search and each filter pill correctly narrow the grid.
- Favoriting persists across reload and the "Favourited" pill reflects it.
- "Start chat" creates a chat, navigates to `/chat/[id]`, and the chat appears in the sidebar.
