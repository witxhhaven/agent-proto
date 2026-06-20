# foundation/mock-data.md — seed data + the localStorage store

Build after `data-models.md`. Provides every feature its data + persistence. **All concrete mock
lists below are provided so the agent does not have to invent them.**

## 1. Visual presets — `src/data/presets.ts`

```ts
// Icon choices for the agent icon picker (Tabler names)
export const ICON_PRESETS = [
  "IconRobot","IconMail","IconNews","IconChartBar","IconSearch","IconCalendar",
  "IconFileText","IconBolt","IconMessage","IconBriefcase","IconBulb","IconWand",
];

// Background color swatches for the avatar
export const COLOR_PRESETS = [
  "#4F46E5","#2563EB","#0EA5E9","#059669","#16A34A","#D97706",
  "#DC2626","#DB2777","#9333EA","#0891B2","#475569","#CA8A04",
];
```

## 2. MCP tools catalog — `src/data/mockTools.ts`

Export `mockTools: McpTool[]`. The Tools dropdown renders each as **two lines**: line 1 = `name`,
line 2 = brand icon (`providerBrand`) + `provider`.

```ts
export const mockTools: McpTool[] = [
  // Google Workspace
  { id: "g_gmail_send",   name: "Gmail — Send email",        provider: "Google Workspace", providerBrand: "google", category: "Email" },
  { id: "g_gmail_search", name: "Gmail — Search inbox",      provider: "Google Workspace", providerBrand: "google", category: "Email" },
  { id: "g_cal_create",   name: "Google Calendar — Create event",   provider: "Google Workspace", providerBrand: "google", category: "Calendar" },
  { id: "g_cal_free",     name: "Google Calendar — Find availability", provider: "Google Workspace", providerBrand: "google", category: "Calendar" },
  { id: "g_drive_search", name: "Google Drive — Search files", provider: "Google Workspace", providerBrand: "google", category: "Files" },
  { id: "g_drive_read",   name: "Google Drive — Read document", provider: "Google Workspace", providerBrand: "google", category: "Files" },
  { id: "g_sheets_append",name: "Google Sheets — Append row",  provider: "Google Workspace", providerBrand: "google", category: "Data" },
  { id: "g_docs_create",  name: "Google Docs — Create document", provider: "Google Workspace", providerBrand: "google", category: "Files" },
  // Microsoft 365
  { id: "m_outlook_send", name: "Outlook — Send email",       provider: "Microsoft 365", providerBrand: "microsoft", category: "Email" },
  { id: "m_outlook_search", name: "Outlook — Search inbox",   provider: "Microsoft 365", providerBrand: "microsoft", category: "Email" },
  { id: "m_teams_post",   name: "Microsoft Teams — Post message", provider: "Microsoft 365", providerBrand: "microsoft", category: "Chat" },
  { id: "m_onedrive_search", name: "OneDrive — Search files", provider: "Microsoft 365", providerBrand: "microsoft", category: "Files" },
  { id: "m_excel_append", name: "Excel — Append row",         provider: "Microsoft 365", providerBrand: "microsoft", category: "Data" },
  { id: "m_sharepoint",   name: "SharePoint — Search site",   provider: "Microsoft 365", providerBrand: "microsoft", category: "Files" },
  { id: "m_cal_create",   name: "Microsoft Calendar — Create event", provider: "Microsoft 365", providerBrand: "microsoft", category: "Calendar" },
];
```
`providerBrand` maps to a brand icon in `iconMap` (`google` → `IconBrandGoogle`, `microsoft` →
`IconBrandWindows`).

## 3. Marketplace seed — `src/data/mockAssistants.ts`

`mockAssistants: Assistant[]`, ~12 entries across all categories with believable name/description/
owner/tags/`iconName` (from ICON_PRESETS) /`bgColor` (from COLOR_PRESETS) /`uses`/`type`. Match the
screenshot where convenient: "Policy Brief Writer", "Email Reply Drafter", "Press Release Drafter",
"Slide Deck Generator", "Deep Research Assistant", "Data Insights Analyzer", "Newsletter",
"Knowledge Q&A".
- Set `classification: "CCE/SN"` on every entry (cosmetic).
- Set `favorited` on 1–2 (so the sidebar Favourited Agents section isn't empty — e.g. "Deep
  Research Assistant").
- Set `saved: true` on ~3 (so the My Agents "Saved Agents" tab has content — the screenshot shows
  Policy Brief Writer, Email Reply Drafter, Press Release Drafter).
- Mark ~4 with `roleRecommended: true` ("Based on your role" row) and ~4 with
  `historyRecommended: true` ("Based on your chat history" row). Set `sharedWithYou` on 1–2.

## 4. Agent templates + seed agents — `src/data/mockAgents.ts`

`agentTemplates: AgentTemplate[]` — the **four shown in the automate modal** plus `scratch`. Names
must match the screenshot:
- **`qa-chatbot`** — "Q&A Chatbot": "Answers staff questions from your policies and SOPs."
- **`meeting-minutes`** — "Meeting Minutes Writer": "Turns meeting notes into clear, shareable
  minutes."
- **`email-reply`** — "Email Reply Drafter": "Drafts replies to incoming emails in your tone."
  toolIds `["g_gmail_send","g_gmail_search"]`, questions like "What tone should replies use?".
- **`document-summariser`** — "Document Summariser": "Condenses long reports and circulars into key
  points."

Each with `defaultInstructions`, `defaultToolIds` (reference real `mockTools` ids),
`defaultQuestions`, optional `defaultKnowledge`. `scratch` is empty.

`seedAgents: Agent[]` — **2 published agents** with full fields (icon, bgColor, instructions,
`knowledgeBase` with at least one file + one link + one snippet, `toolIds`, `questions`). These
populate My Agents + surface in Explore.

## 5. Seed scheduled tasks — `src/data/mockSchedules.ts`

`seedScheduledTasks: ScheduledTask[]` — **2 entries**, both `origin: "schedule-page"`:

1. The example from the brief: title **"Daily Biology and Geology Newsletter"**, standalone
   (`agentId: null`), `instructions` = segments for *"Choose 5 random topics from the file
   biology_geology_topics.txt. Create a short newsletter…"*, `knowledgeFileRef:
   "biology_geology_topics.txt"`, `timing: { frequency: "daily", hour: 10, minute: 0 }`,
   `enabled: true`, and 2–3 `runHistory` entries with mock `response` text (a sample newsletter).
2. One that **wraps a seed agent** (`agentId` set), weekly timing, with run history.

## 6. The store — `src/lib/store.ts`

External store on `useSyncExternalStore`, persisted to `localStorage["prototype:v1"]`, no deps.

### State
```ts
interface StoreState {
  assistants: Assistant[];
  agents: Agent[];
  scheduledTasks: ScheduledTask[];
  chats: Chat[];
}
```

### Requirements
- **Hydration:** if `localStorage["prototype:v1"]` missing → seed from the mock files; else parse.
- **SSR-safe:** never touch `localStorage` on the server. Provide `getServerSnapshot()` returning
  seed state so first client render matches (no hydration mismatch).
- **Persistence:** every action writes whole state back to `localStorage`.
- `useStore<T>(selector)` for reads; `store.actions.*` for writes.

### Actions — implement all
```ts
// agents (published immediately on create)
createAgent(input: Omit<Agent,"id"|"createdAt">): Agent
updateAgent(id, patch: Partial<Agent>): void
deleteAgent(id): void
toggleAgentEnabled(id): void

// scheduled tasks
createScheduledTask(input: Omit<ScheduledTask,"id"|"createdAt"|"lastRun"|"runHistory">): ScheduledTask
updateScheduledTask(id, patch: Partial<ScheduledTask>): void
deleteScheduledTask(id): void
toggleScheduledTaskEnabled(id): void
runScheduledTaskNow(id): void          // pushes a success ScheduledRunLog with a mock response, sets lastRun

// chats
createChat(input: { agentId: string|null; title: string; assistantName?: string }): Chat
appendMessage(chatId, message: Message): void
updateChat(chatId, patch: Partial<Chat>): void

// marketplace + demo
toggleFavorite(assistantId): void
toggleSaved(assistantId): void         // "Save to My Agents" / "Remove from My Agents" (Saved tab)
reset(): void                          // re-seed from src/data/*
```

> `createChat` defaults `assistantName` to **"My AI Assistant"** when none is passed (general home
> chat). The home screen (`features/home.md`) calls `createChat` only on first message send.

`createAgent` also pushes a derived `Assistant` (same id, `isOwned: true`, `type: "Developer"`,
same `iconName`/`bgColor`, category "Productivity") into `assistants`; `deleteAgent` removes both.
**Test-tab interactions and "Test response now" must NOT call any store action** — they live in
ephemeral local state only.

## 7. `src/lib/id.ts`
```ts
export const createId = (prefix: string) =>
  `${prefix}_${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0,8)}`;
```

## Acceptance

- Store hydrates with 2 agents, 2 scheduled tasks (incl. the Biology newsletter), ~12 assistants
  (each with cosmetic `classification`; some `saved`/`favorited`/`roleRecommended`/
  `historyRecommended`), 15 tools, icon/color presets, and the 4 + scratch templates.
- `toggleFavorite` / `toggleSaved` persist across reload. Mutations persist; `reset()` restores seeds.
- No SSR `localStorage` errors and no hydration warnings.
