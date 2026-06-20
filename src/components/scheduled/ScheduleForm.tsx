"use client";

import { Group, Stack, Text, TextInput } from "@mantine/core";
import type { InstructionContent, ScheduleTiming } from "@/types";
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
  function patch(p: Partial<ScheduleDraft>) {
    onChange({ ...value, ...p });
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
        <Text fw={500} size="sm">
          Instructions
        </Text>
        <AgentMentionInput
          value={value.instructions}
          onChange={(instructions) => patch({ instructions })}
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
