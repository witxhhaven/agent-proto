"use client";

import { useState } from "react";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconSparkles, IconArrowBackUp } from "@tabler/icons-react";
import type { InstructionContent, ScheduleTiming } from "@/types";
import { useStore } from "@/lib/store";
import { improveInstruction } from "@/lib/structured";
import {
  instructionToPlainText,
  plainTextToInstruction,
} from "@/lib/instructions";
import { AgentMentionInput } from "./AgentMentionInput";
import { ScheduleBuilder } from "./ScheduleBuilder";

export interface ScheduleDraft {
  title: string;
  agentId: string | null;
  instructions: InstructionContent;
  knowledgeFileRef: string | null;
  timing: ScheduleTiming;
}

export function emptyScheduleDraft(): ScheduleDraft {
  return {
    title: "",
    agentId: null,
    instructions: [{ type: "text", value: "" }],
    knowledgeFileRef: null,
    timing: { frequency: "daily", hour: 9, minute: 0 },
  };
}

export function ScheduleForm({
  value,
  onChange,
}: {
  value: ScheduleDraft;
  onChange: (d: ScheduleDraft) => void;
}) {
  const agents = useStore((s) => s.agents);
  const [improving, setImproving] = useState(false);
  // Snapshot of the instructions before the last AI improvement, for one-click revert.
  const [prevInstructions, setPrevInstructions] =
    useState<InstructionContent | null>(null);

  function patch(p: Partial<ScheduleDraft>) {
    onChange({ ...value, ...p });
  }

  const instructionText = instructionToPlainText(value.instructions);

  async function improve() {
    if (!instructionText.trim() || improving) return;
    setImproving(true);
    try {
      const improved = await improveInstruction(instructionText);
      let next = plainTextToInstruction(improved, agents);
      // Guarantee the agent tag survives: if the rewrite dropped any @mention
      // that was in the original, re-insert it at the front.
      const presentIds = new Set(
        next.filter((s) => s.type === "agent").map((s) => s.agentId)
      );
      const reinsert: InstructionContent = [];
      const added = new Set<string>();
      for (const seg of value.instructions) {
        if (
          seg.type === "agent" &&
          !presentIds.has(seg.agentId) &&
          !added.has(seg.agentId)
        ) {
          added.add(seg.agentId);
          reinsert.push(seg);
        }
      }
      if (reinsert.length) {
        next = [...reinsert, { type: "text", value: " " }, ...next];
      }
      setPrevInstructions(value.instructions);
      patch({ instructions: next });
    } finally {
      setImproving(false);
    }
  }

  function revert() {
    if (prevInstructions) patch({ instructions: prevInstructions });
    setPrevInstructions(null);
  }

  return (
    <Stack gap="md">
      <TextInput
        label="Title"
        placeholder="e.g. Daily news digest"
        value={value.title}
        onChange={(e) => patch({ title: e.currentTarget.value })}
        required
      />

      <Stack gap={6}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text fw={500} size="sm">
            Instructions
          </Text>
          <Group gap={4} wrap="nowrap">
            {prevInstructions && (
              <Button
                variant="subtle"
                color="gray"
                size="compact-xs"
                leftSection={<IconArrowBackUp size={14} />}
                onClick={revert}
              >
                Revert
              </Button>
            )}
            <Button
              variant="subtle"
              size="compact-xs"
              leftSection={<IconSparkles size={14} />}
              onClick={improve}
              loading={improving}
              disabled={!instructionText.trim()}
            >
              Improve with AI
            </Button>
          </Group>
        </Group>
        <AgentMentionInput
          value={value.instructions}
          onChange={(instructions) => {
            // A manual edit invalidates the pending revert snapshot.
            if (prevInstructions) setPrevInstructions(null);
            patch({ instructions });
          }}
        />
      </Stack>

      <TextInput
        label="Knowledge file reference (optional)"
        placeholder="e.g. biology_geology_topics.txt"
        value={value.knowledgeFileRef ?? ""}
        onChange={(e) =>
          patch({ knowledgeFileRef: e.currentTarget.value || null })
        }
      />

      <Stack gap={6}>
        <Text fw={500} size="sm">
          Schedule
        </Text>
        <ScheduleBuilder
          value={value.timing}
          onChange={(timing) => patch({ timing })}
        />
      </Stack>
      <Group />
    </Stack>
  );
}
