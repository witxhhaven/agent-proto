"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import type { IntakeQuestion } from "@/types";

interface LocalMsg {
  role: "user" | "assistant";
  text: string;
}

export interface AgentTestChatProps {
  name: string;
  instructions: string;
  questions: IntakeQuestion[];
}

/**
 * EPHEMERAL test chat. Lives entirely in local state — never written to the
 * store, never shown in the sidebar. Reflects the current (possibly unsaved)
 * form values. If the form has intake questions, it walks through them first.
 */
export function AgentTestChat({
  name,
  instructions,
  questions,
}: AgentTestChatProps) {
  const intake = useMemo(() => questions.filter((q) => q.prompt.trim()), [
    questions,
  ]);

  const [step, setStep] = useState(0); // index into intake; === length when done
  const [answers, setAnswers] = useState<string[]>([]);
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState("");

  const done = step >= intake.length;
  const current = intake[step];

  function restart() {
    setStep(0);
    setAnswers([]);
    setMessages([]);
    setInput("");
  }

  function mockReply(allAnswers: string[]): string {
    const head = `Here's what I'd do as "${name || "this agent"}"`;
    if (allAnswers.length > 0) {
      return `${head}, based on your answers (${allAnswers
        .filter(Boolean)
        .join("; ")}): I'll proceed using the configured instructions${
        instructions ? "" : " (none set yet)"
      }. (mock response)`;
    }
    return `${head}: I'll follow the configured instructions and respond. (mock response)`;
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");

    if (!done) {
      // answering an intake question
      const nextAnswers = [...answers, trimmed];
      const nextMessages: LocalMsg[] = [
        ...messages,
        { role: "user", text: trimmed },
      ];
      const nextStep = step + 1;
      setAnswers(nextAnswers);
      if (nextStep >= intake.length) {
        nextMessages.push({ role: "assistant", text: mockReply(nextAnswers) });
      }
      setMessages(nextMessages);
      setStep(nextStep);
      return;
    }

    // free conversation after intake
    setMessages((m) => [
      ...m,
      { role: "user", text: trimmed },
      { role: "assistant", text: mockReply(answers) },
    ]);
  }

  return (
    <Stack gap="sm" h="100%">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Ephemeral test — nothing here is saved.
        </Text>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          onClick={restart}
        >
          Restart test
        </Button>
      </Group>

      <Stack gap="xs" mih={200}>
        {messages.map((m, i) => (
          <Group key={i} justify={m.role === "user" ? "flex-end" : "flex-start"}>
            <Paper
              withBorder
              p="xs"
              radius="md"
              maw="80%"
              bg={m.role === "user" ? "brand-blue.0" : undefined}
            >
              <Text size="sm">{m.text}</Text>
            </Paper>
          </Group>
        ))}

        {!done && current && (
          <Paper withBorder p="sm" radius="md" bg="gray.0">
            <Text size="sm" fw={500}>
              {current.prompt}
            </Text>
            {current.helpText && (
              <Text size="xs" c="dimmed">
                {current.helpText}
              </Text>
            )}
          </Paper>
        )}
      </Stack>

      <Box style={{ marginTop: "auto" }}>
        <Group gap="xs" align="flex-end">
          <Textarea
            placeholder={
              done ? "Type a message…" : "Type your answer…"
            }
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            autosize
            minRows={1}
            maxRows={4}
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <Button onClick={() => send(input)} disabled={!input.trim()}>
            Send
          </Button>
        </Group>
      </Box>
    </Stack>
  );
}
