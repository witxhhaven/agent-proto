"use client";

import {
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { InstructionContent, ScheduleTiming } from "@/types";
import { useStore } from "@/lib/store";
import { AgentMentionInput } from "./AgentMentionInput";
import { ScheduleBuilder } from "./ScheduleBuilder";

export interface ScheduleDraft {
  title: string;
  mode: "standalone" | "agent";
  agentId: string | null;
  instructions: InstructionContent;
  knowledgeFileRef: string | null;
  timing: ScheduleTiming;
}

export function emptyScheduleDraft(): ScheduleDraft {
  return {
    title: "",
    mode: "standalone",
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
          Mode
        </Text>
        <SegmentedControl
          value={value.mode}
          onChange={(v) =>
            patch({
              mode: v as ScheduleDraft["mode"],
              agentId: v === "agent" ? value.agentId : null,
            })
          }
          data={[
            { value: "standalone", label: "Standalone task" },
            { value: "agent", label: "Use a saved agent" },
          ]}
        />
      </Stack>

      {value.mode === "agent" ? (
        <Select
          label="Agent"
          placeholder="Choose a saved agent"
          data={agents.map((a) => ({ value: a.id, label: a.name }))}
          value={value.agentId}
          onChange={(v) => patch({ agentId: v })}
          nothingFoundMessage="No agents yet"
        />
      ) : (
        <Stack gap={6}>
          <Text fw={500} size="sm">
            Instructions
          </Text>
          <AgentMentionInput
            value={value.instructions}
            onChange={(instructions) => patch({ instructions })}
          />
        </Stack>
      )}

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
