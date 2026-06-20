import type { LlmRequest } from "@/app/api/llm/route";

export interface LlmResponse {
  text?: string;
  data?: unknown;
  mock?: boolean;
  error?: string;
}

export async function callLlm(req: LlmRequest): Promise<LlmResponse> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let detail = `LLM ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

/** text-mode convenience wrapper. */
export async function complete(
  messages: { role: "user" | "assistant"; content: string }[],
  system?: string
): Promise<LlmResponse> {
  return callLlm({ mode: "text", system, messages });
}

/**
 * Streaming text wrapper. Calls `onDelta` with each chunk as it arrives and
 * resolves with the full text once the stream ends. `mock` is true when no API
 * key is configured (the server streamed the deterministic mock reply).
 */
export async function streamComplete(
  messages: { role: "user" | "assistant"; content: string }[],
  opts: {
    system?: string;
    maxTokens?: number;
    onDelta: (chunk: string) => void;
  }
): Promise<{ text: string; mock: boolean }> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "text",
      stream: true,
      system: opts.system,
      maxTokens: opts.maxTokens,
      messages,
    }),
  });
  if (!res.ok || !res.body) {
    let detail = `LLM ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const mock = res.headers.get("x-llm-mock") === "1";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      text += chunk;
      opts.onDelta(chunk);
    }
  }
  return { text, mock };
}
