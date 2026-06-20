import type { Agent, InstructionContent } from "@/types";

/** Flatten instruction segments to plain text (agent pills become "@Name"). */
export function instructionToPlainText(content: InstructionContent): string {
  return content
    .map((seg) => (seg.type === "text" ? seg.value : `@${seg.name}`))
    .join("")
    .trim();
}

/**
 * Convert plain text (which may contain "@AgentName") into instruction segments,
 * resolving any mentioned saved agent into an agent pill segment.
 */
export function plainTextToInstruction(
  text: string,
  agents: Pick<Agent, "id" | "name" | "iconName" | "bgColor">[]
): InstructionContent {
  if (!text) return [{ type: "text", value: "" }];

  // Sort by longest name first so "@Market Pulse" matches before "@Market".
  const sorted = [...agents].sort((a, b) => b.name.length - a.name.length);
  const segments: InstructionContent = [];
  let rest = text;

  outer: while (rest.length > 0) {
    const at = rest.indexOf("@");
    if (at === -1) {
      segments.push({ type: "text", value: rest });
      break;
    }
    // text before the @
    if (at > 0) segments.push({ type: "text", value: rest.slice(0, at) });
    const after = rest.slice(at + 1);
    for (const agent of sorted) {
      if (after.toLowerCase().startsWith(agent.name.toLowerCase())) {
        segments.push({
          type: "agent",
          agentId: agent.id,
          name: agent.name,
          iconName: agent.iconName,
          bgColor: agent.bgColor,
        });
        rest = after.slice(agent.name.length);
        continue outer;
      }
    }
    // no match — keep the "@" as literal text and advance
    segments.push({ type: "text", value: "@" });
    rest = after;
  }

  return segments.length ? segments : [{ type: "text", value: text }];
}
