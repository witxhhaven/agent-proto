# features/agents-list.md — My Agents

Route: `src/app/agents/page.tsx`. Depends on store + app shell.

## UI

- Header: "My Agents" + a primary **"Create agent"** button → `/agents/new`.
- A table/list (`Table` or stacked `Card`s) of `agents` from the store. Per row:
  - Avatar (agent `iconName` on `bgColor`) + Name + short `description`.
  - Tool count badge (number of `toolIds`) and a "Used in N schedules" hint (count
    `scheduledTasks` where `agentId === agent.id`).
  - **Status** `Switch` bound to `enabled` → `store.actions.toggleAgentEnabled(id)`.
  - Row actions (`Menu`): **Edit** → `/agents/[id]` (Settings tab), **Test** → `/agents/[id]` (Test
    tab), **Chat** (create a real chat with this agent and go to it), **Schedule this agent**
    (opens the schedule create flow pre-set to *Use a saved agent* with this `agentId` →
    `features/scheduled.md`), **Delete** (confirm `Modal`, then `store.actions.deleteAgent(id)`).

> Scheduling is no longer an agent field — it lives in `ScheduledTask`. "Schedule this agent" just
> creates a task that wraps this agent.

## States

- **Empty:** no agents → `EmptyState` ("No agents yet", action "Create your first agent").
- **Loading:** gate on the store `hydrated` flag for first paint.

## Acceptance

- Toggling status and deleting persist across reload.
- "Schedule this agent" creates a `ScheduledTask` wrapping the agent, visible on the Scheduled page.
- "Chat" opens a real chat with that agent (triggers intake if it has questions); "Test" opens the
  ephemeral Test tab.
