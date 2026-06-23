"use client";

import { useState } from "react";
import {
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { IntakeAnswer, RenderedQuestion } from "@/types";
import classes from "./IntakeQuestionCard.module.css";

export interface IntakeQuestionCardProps {
  question: RenderedQuestion;
  onAnswer: (answer: IntakeAnswer) => void;
  onSkip: () => void;
  onSkipAll: () => void;
  onBack: () => void;
  canGoBack: boolean;
}

export function IntakeQuestionCard({
  question,
  onAnswer,
  onSkip,
  onSkipAll,
  onBack,
  canGoBack,
}: IntakeQuestionCardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");

  function toggle(label: string) {
    if (question.allowMultiple) {
      setSelected((s) =>
        s.includes(label) ? s.filter((x) => x !== label) : [...s, label]
      );
    } else {
      setSelected((s) => (s.includes(label) ? [] : [label]));
    }
  }

  const canContinue = selected.length > 0 || freeText.trim().length > 0;

  function submit() {
    onAnswer({
      questionId: question.id,
      prompt: question.prompt,
      selectedOptionLabels: selected,
      freeText: freeText.trim() || undefined,
    });
  }

  return (
    <Paper withBorder p="md" radius="md" maw={560} className={classes.card}>
      <Stack gap="sm">
        {question.subQuestionOf && (
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Follow-up
          </Text>
        )}
        <Text fw={600}>{question.prompt}</Text>

        <Stack gap={6}>
          {question.options.map((opt) => {
            const active = selected.includes(opt.label);
            return (
              <UnstyledButton
                key={opt.id}
                onClick={() => toggle(opt.label)}
                p="xs"
                style={{
                  borderRadius: 8,
                  border: active
                    ? "2px solid var(--mantine-color-brand-blue-5)"
                    : "1px solid var(--mantine-color-gray-3)",
                  background: active
                    ? "var(--mantine-color-brand-blue-0)"
                    : undefined,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {opt.label}
                    </Text>
                    {opt.description && (
                      <Text size="xs" c="dimmed">
                        {opt.description}
                      </Text>
                    )}
                  </Stack>
                  {active && <IconCheck size={16} color="var(--mantine-color-brand-blue-6)" />}
                </Group>
              </UnstyledButton>
            );
          })}
        </Stack>

        <Textarea
          placeholder="Or type your own answer…"
          value={freeText}
          onChange={(e) => setFreeText(e.currentTarget.value)}
          autosize
          minRows={1}
        />

        <Group justify="space-between">
          <Group gap="xs">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              disabled={!canGoBack}
              onClick={onBack}
            >
              Back
            </Button>
            <Button variant="subtle" color="gray" size="xs" onClick={onSkipAll}>
              Skip all
            </Button>
          </Group>
          <Group gap="xs">
            <Button variant="subtle" color="gray" size="xs" onClick={onSkip}>
              Skip this
            </Button>
            <Button size="xs" disabled={!canContinue} onClick={submit}>
              Continue
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
