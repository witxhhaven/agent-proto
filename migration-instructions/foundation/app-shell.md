# foundation/app-shell.md — collapsible sidebar + right drawer

Build after the store. This is the skeleton every page renders inside.

> **Branding:** the app is **GOVTECH Desk (BETA)**, not "Agent Studio". Show the wordmark
> "Desk" with a small "BETA" badge in the sidebar header. Colors/styling still use Mantine
> defaults — only the names/labels are fixed.

## 1. App frame — `src/components/shell/AppFrame.tsx`

Use Mantine `AppShell` with:
- **Header:** none by default (the screenshot has no top bar on most pages). Keep a "Reset demo
  data" button (calls `store.actions.reset()`) accessible — put it in the sidebar footer area near
  the user profile, not a global header.
- **Navbar (left sidebar):** collapsible. Use `AppShell` `navbar={{ width: 260, breakpoint: 'sm',
  collapsed: { desktop: collapsed, mobile: !mobileOpen } }}`.
- **Main:** renders `children` (the routed page).

Wire `AppFrame` into `src/app/layout.tsx` so all routes share it. The `MantineProvider`,
`Notifications`, and the `RightDrawerProvider` (below) also live in `layout.tsx`.

## 2. Sidebar — `src/components/shell/Sidebar.tsx`

Structure top-to-bottom (see `desk-srn-shots/main-chat.png`):

- **Header row:** "Desk (BETA)" wordmark + a collapse toggle (`ActionIcon`,
  `IconLayoutSidebarLeftCollapse`/`Expand`). Persist the collapsed boolean in
  `localStorage["prototype:sidebarCollapsed"]`. When collapsed, show icon-only nav with a `Tooltip`
  per item.
- **New Chat** — the top **primary** action (`IconMessagePlus` / pencil-in-box). Routes to `/`
  (the home/welcome chat). This replaces the old "Create agent" sidebar button — create-agent now
  lives on the My Agents page, NOT here.
- Nav items (use `next/navigation` `usePathname()` to mark the active one):
  - **New Project** → disabled, label "New Project (Coming Soon)" (`IconFolderPlus`). Renders as a
    muted, non-clickable row — a visible stub only.
  - **Connectors** → `/connectors` (`IconPlug`)
  - **Agent Marketplace** → `/explore` (`IconCompass`) — keep the `/explore` route; only the label
    changes to "Agent Marketplace".
  - **My Agents** → `/agents` (`IconRobot`)
  - **Scheduled** → `/scheduled` (`IconClock`)
- **Favourited Agents** section (header "FAVOURITED AGENTS"): lists agents the user has hearted in
  the marketplace (`agents` where `favorited === true`, capped ~5). Each row → opens a chat with that
  agent. Hide the whole section when empty.
- **Recent Chats** section (header "RECENT CHATS" + a small info `IconInfoCircle`): lists recent
  `chats` from the store (title + assistant name), each links to `/chat/[id]`. Empty list shows a
  small muted hint. **Note:** a chat only appears here once its first message is sent — blank/new
  chats are not listed (see `features/home.md` + `features/chat.md`).
- **Footer:** user profile pinned to the bottom — avatar + "Alvin LEU (GOVTECH)" + a chevron menu
  that contains "Reset demo data".

Keep it clean — this is structure, not a pixel match.

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

- Sidebar shows the "Desk (BETA)" wordmark and the full nav: New Chat, New Project (disabled),
  Connectors, Agent Marketplace, My Agents, Scheduled.
- Sidebar collapses/expands; state persists across reload.
- Active nav item is highlighted based on the URL.
- "New Chat" routes to `/`; "New Project" is visibly disabled and does nothing.
- The Recent Chats section reflects chats in the store and updates live; Favourited Agents lists
  hearted agents and hides when empty.
- User profile sits in the sidebar footer; its menu exposes "Reset demo data".
- From any page, calling `useRightDrawer().open(<div>hi</div>, { title: 'Test' })` slides a panel
  in from the right over the content (no full-screen overlay) and `close()` dismisses it.
