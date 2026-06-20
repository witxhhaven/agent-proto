# foundation/app-shell.md — collapsible sidebar + right drawer

Build after the store. This is the skeleton every page renders inside.

## 1. App frame — `src/components/shell/AppFrame.tsx`

Use Mantine `AppShell` with:
- **Header** (optional, slim): product name + a "Reset demo data" button (calls `store.actions.reset()`).
- **Navbar (left sidebar):** collapsible. Use `AppShell` `navbar={{ width: 260, breakpoint: 'sm',
  collapsed: { desktop: collapsed, mobile: !mobileOpen } }}`.
- **Main:** renders `children` (the routed page).

Wire `AppFrame` into `src/app/layout.tsx` so all routes share it. The `MantineProvider`,
`Notifications`, and the `RightDrawerProvider` (below) also live in `layout.tsx`.

## 2. Sidebar — `src/components/shell/Sidebar.tsx`

- A collapse toggle (`ActionIcon` with a chevron / `IconLayoutSidebar`). Persist the collapsed
  boolean in `localStorage["prototype:sidebarCollapsed"]`.
- When collapsed, show icon-only nav (Mantine `NavLink` with no label, or a `Tooltip` per item).
- Nav items (use `next/navigation` `usePathname()` to mark the active one):
  - **Explore** → `/explore` (`IconCompass`)
  - **My Agents** → `/agents` (`IconRobot`)
  - **Scheduled** → `/scheduled` (`IconClock`)
  - **Chats** → a list section, not a single route
- **Chats section:** list recent `chats` from the store (title + assistant name), each links to
  `/chat/[id]`. Include a "New chat" affordance that creates a generic chat and navigates to it.
- **Create agent** button pinned near the top → `/agents/new`.

Keep it clean — this is structure, not a pixel match. Empty chats list shows a small muted hint.

## 3. Right drawer — reusable, context-driven

The agent-creation AI-assist (and potentially other features) opens a **right-side panel**.
Implement it once as a provider so any component can open it with arbitrary content.

### `src/components/shell/RightDrawerProvider.tsx`
```ts
interface RightDrawerApi {
  open: (content: ReactNode, opts?: { title?: string; width?: number }) => void;
  close: () => void;
  isOpen: boolean;
}
```
- Backed by Mantine `Drawer` with `position="right"`, `withOverlay={false}` (so the user can see
  the form while using the assistant), default `size={420}`.
- Expose `useRightDrawer()` hook returning the `RightDrawerApi`.
- Render the `<Drawer>` once inside the provider; `open()` sets its content + title and opens it.

This is the "right drawer when needed" skeleton from the brief. `features/agent-creation.md` uses
it to host the AI-assist chat.

## Acceptance

- Sidebar collapses/expands; state persists across reload.
- Active nav item is highlighted based on the URL.
- The Chats section reflects chats in the store and updates live when one is created.
- From any page, calling `useRightDrawer().open(<div>hi</div>, { title: 'Test' })` slides a panel
  in from the right over the content (no full-screen overlay) and `close()` dismisses it.
