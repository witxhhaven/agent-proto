import Anthropic from "@anthropic-ai/sdk";

export interface LlmRequest {
  mode: "text" | "structured";
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  tool?: { name: string; description: string; input_schema: object };
  maxTokens?: number;
}

export async function POST(req: Request) {
  let body: LlmRequest;
  try {
    body = (await req.json()) as LlmRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  // No key → tell the client to use its deterministic mock.
  if (!key) return Response.json({ mock: true });

  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

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
    return Response.json({ error: message }, { status: 500 });
  }
}
