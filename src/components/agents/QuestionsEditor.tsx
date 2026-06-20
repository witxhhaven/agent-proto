"use client";

import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash, IconPlus, IconSparkles } from "@tabler/icons-react";
import type { IntakeQuestion } from "@/types";
import { createId } from "@/lib/id";

export interface QuestionsEditorProps {
  questions: IntakeQuestion[];
  onChange: (questions: IntakeQuestion[]) => void;
  onGenerate: () => void;
}

export function QuestionsEditor({
  questions,
  onChange,
  onGenerate,
}: QuestionsEditorProps) {
  function update(id: string, patch: Partial<IntakeQuestion>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  return (
    <Stack gap="sm">
      {questions.length === 0 && (
        <Text size="sm" c="dimmed">
          No intake questions yet. Add questions to ask the user when a chat
          starts, or generate them with AI.
        </Text>
      )}
      {questions.map((q, i) => (
        <Paper key={q.id} withBorder p="sm" radius="sm">
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap">
              <Text size="xs" c="dimmed">
                Question {i + 1}
              </Text>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => onChange(questions.filter((x) => x.id !== q.id))}
                aria-label="Remove question"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
            <TextInput
              placeholder="What do you want to ask?"
              value={q.prompt}
              onChange={(e) => update(q.id, { prompt: e.currentTarget.value })}
            />
            <TextInput
              placeholder="Help text (optional)"
              value={q.helpText ?? ""}
              onChange={(e) => update(q.id, { helpText: e.currentTarget.value })}
              size="xs"
            />
            <Switch
              label="Allow multiple selections"
              checked={q.allowMultiple ?? false}
              onChange={(e) =>
                update(q.id, { allowMultiple: e.currentTarget.checked })
              }
              size="xs"
            />
          </Stack>
        </Paper>
      ))}

      <Group gap="xs">
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            onChange([...questions, { id: createId("q"), prompt: "" }])
          }
        >
          Add question
        </Button>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconSparkles size={14} />}
          onClick={onGenerate}
        >
          Generate / improve with AI
        </Button>
      </Group>
    </Stack>
  );
}
