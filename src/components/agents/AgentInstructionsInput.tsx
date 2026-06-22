"use client";

import { useMemo } from "react";
import type { Agent, InstructionContent } from "@/types";
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
  const assistants = useStore((s) => s.assistants);
  // Resolve mentions against the SAME catalog the picker offers (your agents +
  // marketplace assistants), deduped by id — otherwise a mentioned assistant
  // round-trips back to literal "@Name" text instead of re-rendering as a pill.
  const mentionable = useMemo<
    Pick<Agent, "id" | "name" | "iconName" | "bgColor">[]
  >(() => {
    const map = new Map<
      string,
      Pick<Agent, "id" | "name" | "iconName" | "bgColor">
    >();
    for (const a of [...agents, ...assistants]) {
      if (!map.has(a.id))
        map.set(a.id, {
          id: a.id,
          name: a.name,
          iconName: a.iconName,
          bgColor: a.bgColor,
        });
    }
    return [...map.values()];
  }, [agents, assistants]);
  const content = useMemo(
    () => plainTextToInstruction(value, mentionable),
    [value, mentionable]
  );

  return (
    <AgentMentionInput
      value={content}
      onChange={(c) => onChange(serializeNoTrim(c))}
      placeholder={placeholder}
    />
  );
}
