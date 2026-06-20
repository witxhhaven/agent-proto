# Agent avatar images

Drop avatar image files here (`.png`, `.jpg`, `.svg`, `.webp`). Anything in `public/`
is served at the site root, so a file at:

    public/avatars/policy-bot.png

is reachable in the app at:

    /avatars/policy-bot.png

## How to use one

Any agent/assistant can carry an optional `imageUrl`. When set, `AgentAvatar`
renders the image; otherwise it falls back to the icon + colour. Examples:

- **Seed data** (`src/data/mockAssistants.ts` / `src/data/mockAgents.ts`):
  add `imageUrl: "/avatars/policy-bot.png"` to an entry.
- **Agent builder** (`/agents/new` → Settings → "Icon & color"): paste an image
  URL (e.g. `/avatars/policy-bot.png`) into the **Avatar image URL** field.

Keep images small and roughly square (≈128×128 looks good); they're rendered in a
circle/rounded square and downscaled.
