# ai/proxy-setup.md — the LLM route handler (the only backend)

A single Next.js **route handler** holds the API key and forwards to Claude. The browser never sees
the key. Build the **mock path first** so every AI feature works before a key exists.

## 1. Environment

`.env.local` (gitignored) — and commit a `.env.local.example`:
```
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
```
> `claude-sonnet-4-6` is the current Sonnet id at time of writing. If the project errors on an
> unknown model, check the latest Sonnet id and update `ANTHROPIC_MODEL` — do not hardcode the model
> in multiple places; read it from env.

## 2. Route — `src/app/api/llm/route.ts`

Accepts a typed request and returns either free-text or a forced structured object.

```ts
// Request body
interface LlmRequest {
  mode: "text" | "structured";
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  // for mode "structured":
  tool?: { name: string; description: string; input_schema: object };
  maxTokens?: number;
}
```

Behavior:
- **No key** (`!process.env.ANTHROPIC_API_KEY`) → return `{ mock: true }` with HTTP 200 and let the
  client fall back to its mock generator. (Or echo a simple deterministic stub for `text` mode.)
- **With key** → call the SDK:

```ts
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const body = (await req.json()) as LlmRequest;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ mock: true });

  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  if (body.mode === "structured" && body.tool) {
    const msg = await client.messages.create({
      model,
      max_tokens: body.maxTokens ?? 1024,
      system: body.system,
      tools: [{ name: body.tool.name, description: body.tool.description,
                input_schema: body.tool.input_schema as any }],
      tool_choice: { type: "tool", name: body.tool.name },   // force the tool -> guaranteed JSON
      messages: body.messages,
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    return Response.json({ data: block?.type === "tool_use" ? block.input : null });
  }

  const msg = await client.messages.create({
    model,
    max_tokens: body.maxTokens ?? 1024,
    system: body.system,
    messages: body.messages,
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return Response.json({ text });
}
```

- Wrap in try/catch → on error return HTTP 500 `{ error: string }`; the client surfaces it via an
  `ErrorState`/retry, never crashes.
- This handler runs **server-side only** (route handlers always do), so the key stays secret.

## 3. Client helper — `src/lib/llm.ts`

```ts
export async function callLlm(req: LlmRequest): Promise<{ text?: string; data?: unknown; mock?: boolean }> {
  const res = await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req) });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  return res.json();
}
export async function complete(messages, system?) { /* mode:"text" wrapper */ }
```

## Acceptance

- With no key, `POST /api/llm` returns `{ mock: true }` and the app runs fully on mock data.
- With a key in `.env.local`, a `text`-mode call returns a real completion and a `structured`-mode
  call returns a populated `data` object.
- The key is never present in any client bundle or network response to the browser.
