# features/agent-creation.md — creation form (Settings) + Test tab + AI-assist

Routes: `src/app/agents/new/page.tsx` (create) and `src/app/agents/[id]/page.tsx` (edit). The
detail page has **two tabs**: **Settings** (the form) and **Test** (an ephemeral chat). Depends on
store, app shell, right drawer, presets, mockTools, and the AI helpers in `ai/` (mock mode until a
key is added).

> **Lifecycle: published immediately.** Saving the form persists a live agent (no draft gate). The
> Test tab is always available so the creator can try it before/after saving. There is a single
> primary action — **Save** (label it "Save & publish" if you like). A saved agent appears in My
> Agents and Explore right away.

## 1. Create entry — "What would you like to automate?" modal

See `desk-srn-shots/my-agents_created-by-me_new-agent.png`. The **"+ New Agent"** button on the
My Agents page (and navigating to `/agents/new` directly) opens `AgentTemplatesModal`:

- Title **"What would you like to automate?"**
- A free-text box "Build an agent or perform a task" with a submit **arrow** button →
  `generateAgentDraft(description)` (see `ai/structured-output.md`), routes to the editor with the
  draft pre-filled. Works in mock mode without a key.
- Subheading "Or choose from our templates:" then a grid of template cards (icon + name +
  one-liner) — seed these four to match the screenshot: **Q&A Chatbot**, **Meeting Minutes
  Writer**, **Email Reply Drafter**, **Document Summariser**. Picking one seeds the form
  (instructions, toolIds, questions, knowledge, icon, bgColor) and opens the editor.
- A **"Start from scratch"** button at the bottom → opens the editor blank as "Untitled Agent".

Implement the editor at `/agents/new` (blank/seeded) and `/agents/[id]` (existing). The modal can be
a route-level modal on `/agents/new` and/or opened imperatively from the My Agents button; either
way it precedes the editor.

> **Editor header** (see `..._new-agent_from-scratch.png`): a back arrow + the agent's avatar +
> editable title defaulting to **"Untitled Agent"**, with a **Save** split-button (caret) on the
> right and an **AI-assist sparkle** `ActionIcon` that opens the drawer in section 7. A "Custom
> Agent" intro card sits above the first field when starting from scratch.

## 2. Settings tab — `src/components/agents/AgentForm.tsx`

Fixed fields, in this order:

1. **Name** — `TextInput`, required.
2. **Icon + background color** — `IconColorPicker` (section 3).
3. **Description** — short `TextInput`/`Textarea` (used on the Explore card).
4. **Knowledge base** — `KnowledgeBaseField` (section 4): files + links + text snippets.
5. **Instructions** — `Textarea`, `autosize`, `minRows={4}`. The agent's system behavior.
6. **Tools** — `ToolsSelect` (section 5): searchable MCP multi-select, two-line options.
7. **Questions** — `QuestionsEditor` (section 6): the intake MCQ list + "Generate with AI".

Footer: **Save** (`createAgent`/`updateAgent` + toast + stay on page or go to `/agents`),
**Cancel**. Validate Name non-empty.

## 3. Icon + color picker — `src/components/agents/IconColorPicker.tsx`

- Shows a live **avatar preview**: the chosen icon on the chosen `bgColor`.
- A grid of `ICON_PRESETS` (resolve via `iconMap`) — click to select.
- A row of `COLOR_PRESETS` swatches — click to select.
- Props: `{ iconName, bgColor, onChange }`. No uploads — preset-only.

## 4. Knowledge base field — `src/components/agents/KnowledgeBaseField.tsx`

Three sub-sections (tabs or stacked), all mocked — nothing is parsed:
- **Files:** a drop/"Add file" button → on selection store `{ name, sizeLabel, kind }` (derive
  `kind` from extension; fake `sizeLabel` like "248 KB"). Render as removable file chips. (Use
  Mantine `Dropzone` or a plain file input; do not upload anywhere.)
- **Links:** add a URL (+ optional title) → list of removable link rows.
- **Text snippets:** add `{ title, content }` blocks → editable/removable.
Edits update the `KnowledgeBase` object on the form. Email-drafter-style: seed templates include a
sample file + link + snippet so the field isn't empty.

## 5. Tools select — `src/components/agents/ToolsSelect.tsx`

Searchable multi-select over `mockTools`. **Each option renders two lines:**
- Line 1: `tool.name` (e.g. "Gmail — Send email").
- Line 2: small brand icon (`providerBrand` via iconMap) + `tool.provider` in muted small text.

Implement with Mantine `MultiSelect` using a custom `renderOption`, or a `Combobox` for full control
of the two-line layout. Selected tools show as pills (tool name). Filter by name/provider as the
user types. Bind to `toolIds`. Prefill from the template's `defaultToolIds`.

## 6. Questions editor — `src/components/agents/QuestionsEditor.tsx`

Authors `IntakeQuestion[]` (asked at chat start). Editable rows: `prompt`, optional `helpText`,
`allowMultiple` switch, reorder, remove. **"Add question"** appends a blank. **"✨ Generate /
improve with AI"** opens the AI-assist right drawer (section 7).

## 7. AI-assist drawer — `src/components/agents/AiAssistDrawer.tsx`

Open via `useRightDrawer().open(<AiAssistDrawer/>, { title: "AI assist" })`. A lightweight chat
panel scoped to **building this agent**. On submit, call `generateAgentDraft({ description,
currentQuestions })`; the model returns a structured patch `{ name?, description?, instructions?,
toolIds?, questions }`. Show proposed changes with **Apply** / **Dismiss**; Apply merges into the
form state. Works in mock mode without a key.

## 8. Test tab — `src/components/agents/AgentTestChat.tsx` (EPHEMERAL)

- Renders the same chat UI as `features/chat.md`, but entirely in **local state** — never written to
  the store, never shown in the sidebar.
- On open (or a "Restart test" button) it starts fresh: if the (current, unsaved-OK) form has
  `questions`, it runs the **intake flow** (`features/intake-questions.md`) against those questions,
  then a mock assistant reply. This lets the creator experience exactly what an end-user will.
- Uses the live form values (so testing reflects unsaved edits).

## Acceptance

- "+ New Agent" / `/agents/new` opens the "What would you like to automate?" modal with the four
  template cards + free-text box + "Start from scratch".
- The editor header shows the avatar, an editable "Untitled Agent" title, a Save split-button, and
  the AI-assist sparkle.
- Settings tab shows all 7 fields; template selection prefills them; "Start from scratch" is blank.
- Icon/color picker updates a live avatar preview.
- Tools dropdown is searchable and shows the two-line (name / brand + provider) format; selections
  persist on save.
- Knowledge base accepts mock files, links, and snippets and persists them.
- Saving creates/updates a live agent (in My Agents + Explore) immediately.
- Test tab runs the intake questions against the current form and leaves **no** trace in the store
  or sidebar after you leave it.
