# features/connectors.md — Connectors (static "coming soon")

Route: `src/app/connectors/page.tsx`. Depends on store + app shell.

> **No real OAuth / no working integrations** (CLAUDE.md forbids it). This is a static placeholder
> page only — there is nothing to persist here.

## UI

- Header: title "Connectors" + a one-line description ("Connect your tools so agents can act on your
  behalf — coming soon.").
- Body: a muted grid of integration placeholders (e.g. Gmail, Google Drive, Outlook, Slack,
  OneDrive) rendered as disabled `Card`s — brand icon + name + a disabled "Connect" button or a
  "Coming soon" `Badge`. Purely visual; no toggles, no state.

## Acceptance

- `/connectors` renders the titled page with disabled integration placeholders.
- Nothing is clickable/functional; no console errors.
