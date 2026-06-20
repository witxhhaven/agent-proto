"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconSparkles, IconBolt } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import type { ScheduledTask } from "@/types";
import { actions, getState } from "@/lib/store";
import { extractSchedule } from "@/lib/structured";
import { plainTextToInstruction, instructionToPlainText } from "@/lib/instructions";
import {
  ScheduleForm,
  emptyScheduleDraft,
  type ScheduleDraft,
} from "./ScheduleForm";

/** Build an editable draft from an existing scheduled task. */
function draftFromTask(task: ScheduledTask): ScheduleDraft {
  return {
    title: task.title,
    mode: task.agentId ? "agent" : "standalone",
    agentId: task.agentId,
    instructions: task.instructions,
    knowledgeFileRef: task.knowledgeFileRef ?? null,
    timing: task.timing,
  };
}

export function ScheduleCreate({
  opened,
  onClose,
  defaultAgentId,
  task,
}: {
  opened: boolean;
  onClose: () => void;
  defaultAgentId?: string | null;
  /** When provided, the modal edits this task (prefilled) instead of creating. */
  task?: ScheduledTask;
}) {
  const isEdit = !!task;
  const makeInitial = (): ScheduleDraft => {
    if (task) return draftFromTask(task);
    const base = emptyScheduleDraft();
    if (defaultAgentId) {
      base.mode = "agent";
      base.agentId = defaultAgentId;
    }
    return base;
  };
  const [draft, setDraft] = useState<ScheduleDraft>(makeInitial);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);

  // Re-prefill from the task each time an edit modal is (re)opened.
  useEffect(() => {
    if (opened && task) {
      setDraft(draftFromTask(task));
      setTestResponse(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, task]);

  async function runAi() {
    const text = aiPrompt.trim();
    if (!text) return;
    setAiLoading(true);
    try {
      const agents = getState().agents.map((a) => ({ id: a.id, name: a.name }));
      const extracted = await extractSchedule(text, agents);
      setDraft((d) => ({
        ...d,
        title: extracted.title || d.title,
        mode: extracted.agentId ? "agent" : "standalone",
        agentId: extracted.agentId ?? null,
        instructions: plainTextToInstruction(
          extracted.instructionsText,
          getState().agents
        ),
        timing: extracted.timing,
      }));
      notifications.show({
        title: extracted.isSchedule ? "Draft ready" : "Filled from text",
        message: "Review the schedule below, then save.",
        color: "brand-blue",
      });
    } finally {
      setAiLoading(false);
    }
  }

  // Ephemeral — NOT written to runHistory.
  function testNow() {
    const desc =
      draft.mode === "agent"
        ? `agent "${getState().agents.find((a) => a.id === draft.agentId)?.name ?? "—"}"`
        : instructionToPlainText(draft.instructions) || "this task";
    setTestResponse(
      `Sample output for ${desc}: here's what a run would produce. (mock response — not saved)`
    );
  }

  function save() {
    if (!draft.title.trim()) {
      notifications.show({
        title: "Title required",
        message: "Give your schedule a title before saving.",
        color: "red",
      });
      return;
    }
    const fields = {
      title: draft.title.trim(),
      instructions: draft.instructions,
      agentId: draft.mode === "agent" ? draft.agentId : null,
      knowledgeFileRef: draft.knowledgeFileRef,
      timing: draft.timing,
    };
    if (isEdit && task) {
      actions.updateScheduledTask(task.id, fields);
      notifications.show({
        title: "Schedule updated",
        message: `${fields.title} has been updated.`,
        color: "brand-blue",
      });
    } else {
      actions.createScheduledTask({
        ...fields,
        enabled: true,
        origin: "schedule-page",
      });
      notifications.show({
        title: "Schedule created",
        message: `${fields.title} is now scheduled.`,
        color: "brand-blue",
      });
    }
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? "Edit schedule" : "New schedule"}
      size="lg"
      centered
    >
      <Stack gap="md">
        <Paper withBorder p="sm" radius="md" bg="gray.0">
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Describe what to run and when
            </Text>
            <Group align="flex-end" gap="xs" wrap="nowrap">
              <Textarea
                placeholder="e.g. Send me a news digest every weekday at 8am"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.currentTarget.value)}
                autosize
                minRows={1}
                style={{ flex: 1 }}
              />
              <Button
                leftSection={<IconSparkles size={16} />}
                onClick={runAi}
                loading={aiLoading}
                disabled={!aiPrompt.trim()}
              >
                Draft
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Divider label="Schedule details" labelPosition="left" />

        <ScheduleForm value={draft} onChange={setDraft} />

        {testResponse && (
          <Alert color="brand-blue" variant="light" title="Test response (not saved)">
            {testResponse}
          </Alert>
        )}

        <Group justify="space-between">
          <Button
            variant="default"
            leftSection={<IconBolt size={16} />}
            onClick={testNow}
          >
            Test response now
          </Button>
          <Group gap="xs">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
