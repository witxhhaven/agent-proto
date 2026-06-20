# features/agents-list.md — My Agents

Route: `src/app/agents/page.tsx`. Depends on store + app shell.

See `desk-srn-shots/my-agents_created-by-me.png` and `my-agents_saved-agents.png`.

## UI

- **Header row:** title "My Agents" on the left. On the right: a **"N/5 agents used"** quota
  pill + a primary **"+ New Agent"** button. The New Agent button opens the **automate modal**
  (see `features/agent-creation.md`), NOT a direct route push.
  - The quota counts **Created by You** agents only; `5` is the cap (cosmetic — when at cap, show
    the pill in a warning color; you may disable New Agent, but a hard block isn't required).
- **Tabs** (Mantine `Tabs`, pill style): **"Created by You"** and **"Saved Agents (N)"** where N =
  count of saved marketplace assistants.

### Created by You tab
- A table/list (`Table` or stacked `Card`s) of `agents` the user created. Per row:
  - Avatar (agent `iconName` on `bgColor`) + Name + short `description`.
  - Tool count badge (number of `toolIds`) and a "Used in N schedules" hint (count
    `scheduledTasks` where `agentId === agent.id`).
  - **Status** `Switch` bound to `enabled` → `store.actions.toggleAgentEnabled(id)`.
  - Row actions (`Menu`): **Edit** → `/agents/[id]` (Settings tab), **Test** → `/agents/[id]` (Test
    tab), **Chat** (create a real chat with this agent and go to it), **Schedule this agent**
    (opens the schedule create flow pre-set to *Use a saved agent* with this `agentId` →
    `features/scheduled.md`), **Delete** (confirm `Modal`, then `store.actions.deleteAgent(id)`).

### Saved Agents tab
- Grid of the marketplace assistants the user saved (`saved === true`), reusing `AssistantCard`
  with the **"Remove from My Agents"** action. Caption above: "Agents you save here can be used by
  your Personal AI Assistant." Empty → `EmptyState` pointing to the Agent Marketplace.

> Scheduling is no longer an agent field — it lives in `ScheduledTask`. "Schedule this agent" just
> creates a task that wraps this agent.

## States

- **Empty (Created by You):** no created agents → `EmptyState` ("No agents found", subtext
  "Create an agent from a template to automate a repeatable task.", action **"+ New Agent"** that
  opens the automate modal).
- **Empty (Saved Agents):** none saved → `EmptyState` linking to the Agent Marketplace.
- **Loading:** gate on the store `hydrated` flag for first paint.

## Acceptance

- Two tabs render: "Created by You" and "Saved Agents (N)"; the "N/5 agents used" pill reflects the
  created-agent count and updates after create/delete.
- "+ New Agent" opens the automate modal (per `features/agent-creation.md`).
- Saving/removing on the Saved Agents tab persists across reload and stays in sync with the
  marketplace heart/save state.
- Toggling status and deleting persist across reload.
- "Schedule this agent" creates a `ScheduledTask` wrapping the agent, visible on the Scheduled page.
- "Chat" opens a real chat with that agent (triggers intake if it has questions); "Test" opens the
  ephemeral Test tab.
