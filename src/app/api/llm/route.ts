import Anthropic from "@anthropic-ai/sdk";

// The LLM proxy (api.ai.tech.gov.sg) is in Singapore. Run this function in
// Vercel's Singapore region so requests don't cross the Pacific twice — that
// round-trip, not the model, is what makes Haiku feel slow on the US default.
export const preferredRegion = "sin1";
export const runtime = "nodejs";
export const maxDuration = 60;

export interface LlmRequest {
  mode: "text" | "structured";
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  tool?: { name: string; description: string; input_schema: object };
  maxTokens?: number;
  /** text mode only — stream the reply as plain-text chunks. */
  stream?: boolean;
}

const MOCK_REPLY =
  "Here's a mock reply. Add an ANTHROPIC_API_KEY to .env.local for real responses.";

export async function POST(req: Request) {
  let body: LlmRequest;
  try {
    body = (await req.json()) as LlmRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  // No key → fall back to a deterministic mock. For streaming requests we still
  // return a (tiny) text stream so the client can read it the same way.
  if (!key) {
    if (body.stream) {
      return new Response(MOCK_REPLY, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "x-llm-mock": "1" },
      });
    }
    return Response.json({ mock: true });
  }

  // maxRetries:0 TEMP — surface the real upstream error fast instead of the SDK
  // silently retrying 3x (~33s) before failing. Restore default once fixed.
  const client = new Anthropic({ apiKey: key, maxRetries: 0 });
  const model = process.env.ANTHROPIC_MODEL ?? "bedrock.claude-haiku-4-5";
  // TEMP diagnostics — remove once latency is understood. Shows in Vercel logs.
  const region = process.env.VERCEL_REGION ?? "local";
  const baseURL = process.env.ANTHROPIC_BASE_URL ?? "api.anthropic.com";
  const t0 = Date.now();

  // Streaming text path — emit text deltas as they arrive.
  if (body.stream && body.mode !== "structured") {
    const encoder = new TextEncoder();
    const rs = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model,
            max_tokens: body.maxTokens ?? 1024,
            system: body.system,
            messages: body.messages,
          });
          let first = true;
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              if (first) {
                first = false;
                console.log(
                  `[llm] region=${region} base=${baseURL} model=${model} TTFT=${Date.now() - t0}ms`
                );
              }
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          console.log(`[llm] region=${region} stream_total=${Date.now() - t0}ms`);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "LLM stream failed";
          controller.enqueue(encoder.encode(`\n[error: ${message}]`));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(rs, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    if (body.mode === "structured" && body.tool) {
      const msg = await client.messages.create({
        model,
        max_tokens: body.maxTokens ?? 1024,
        system: body.system,
        tools: [
          {
            name: body.tool.name,
            description: body.tool.description,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            input_schema: body.tool.input_schema as any,
          },
        ],
        tool_choice: { type: "tool", name: body.tool.name },
        messages: body.messages,
      });
      const block = msg.content.find((b) => b.type === "tool_use");
      return Response.json({
        data: block?.type === "tool_use" ? block.input : null,
      });
    }

    const msg = await client.messages.create({
      model,
      max_tokens: body.maxTokens ?? 1024,
      system: body.system,
      messages: body.messages,
    });
    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM request failed";
    // TEMP diagnostics — log the real upstream failure (status + body).
    const status = (err as { status?: number })?.status;
    console.error(
      `[llm] region=${region} model=${model} mode=${body.mode} UPSTREAM_ERROR status=${status} msg=${message}`
    );
    return Response.json({ error: message }, { status: 500 });
  }
}
