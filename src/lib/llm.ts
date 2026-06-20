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
