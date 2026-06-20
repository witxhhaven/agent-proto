"use client";

import { useMemo } from "react";
import type { InstructionContent } from "@/types";
import { useStore } from "@/lib/store";
import { plainTextToInstruction } from "@/lib/instructions";
import { AgentMentionInput } from "@/components/scheduled/AgentMentionInput";

/**
 * Instructions field for the agent editor with inline @agent mention pills.
 * The agent's `instructions` stays a plain string (so it can be used directly as
 * the LLM system prompt); mentioned agents are stored as "@AgentName" text and
 * re-rendered as pills. Bridges the string value to the segment-based
 * AgentMentionInput. Supports multiple mentions.
 */

// Serialize segments WITHOUT trimming, so trailing spaces survive live edits
// (instructionToPlainText trims, which would eat spaces as you type).
function serializeNoTrim(content: InstructionContent): string {
  return content
    .map((seg) => (seg.type === "text" ? seg.value : `@${seg.name}`))
    .join("");
}

export function AgentInstructionsInput({
  value,
  onChange,
  placeholder = "Describe how the agent should behave… type @ to mention an agent",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const agents = useStore((s) => s.agents);
  const content = useMemo(
    () => plainTextToInstruction(value, agents),
    [value, agents]
  );

  return (
    <AgentMentionInput
      value={content}
      onChange={(c) => onChange(serializeNoTrim(c))}
      placeholder={placeholder}
    />
  );
}
