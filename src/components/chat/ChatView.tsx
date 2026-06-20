"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import type { Message } from "@/types";
import { actions, getState, useStore } from "@/lib/store";
import { createId } from "@/lib/id";
import { extractSchedule } from "@/lib/structured";
import { AgentAvatar } from "@/components/common/AgentAvatar";
import { Composer } from "./Composer";
import { IntakeFlow } from "./IntakeFlow";
import { ScheduleCard } from "@/components/scheduled/ScheduleCard";

export function ChatView({ chatId }: { chatId: string }) {
  const chat = useStore((s) => s.chats.find((c) => c.id === chatId));
  const agent = useStore((s) =>
    chat?.agentId ? s.agents.find((a) => a.id === chat.agentId) : undefined
  );
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  if (!chat) {
    return (
      <Container size="md" py="xl">
        <Text fw={600}>Chat not found</Text>
        <Text size="sm" c="dimmed">
          This chat may have been deleted.
        </Text>
      </Container>
    );
  }

  const intakeActive =
    !!agent && agent.questions.length > 0 && !chat.intakeComplete;

  function appendUser(text: string) {
    actions.appendMessage(chat!.id, {
      id: createId("msg"),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      kind: "text",
    });
  }

  function appendAssistant(content: string, extra?: Partial<Message>) {
    actions.appendMessage(chat!.id, {
      id: createId("msg"),
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
      kind: "text",
      ...extra,
    });
  }

  async function send(text: string) {
    setValue("");
    appendUser(text);
    setBusy(true);
    try {
      // 1. schedule extraction
      const agents = getState().agents.map((a) => ({ id: a.id, name: a.name }));
      const extracted = await extractSchedule(text, agents);
      if (extracted.isSchedule) {
        const task = actions.createScheduledTask({
          title: extracted.title,
          instructions: [{ type: "text", value: extracted.instructionsText }],
          agentId: extracted.agentId ?? null,
          knowledgeFileRef: null,
          timing: extracted.timing,
          enabled: true,
          origin: "chat",
        });
        appendAssistant("I've scheduled that for you:", {
          kind: "schedule-card",
          scheduledTaskId: task.id,
        });
        return;
      }
      // 2. normal mock reply (real reply would call complete() with a key)
      appendAssistant(
        `Here's a response to "${text.slice(0, 60)}". (mock — add an API key for real replies)`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container size="md" py="lg" h="100%">
      <Stack h="100%" gap="md">
        {/* header */}
        <Group gap="sm">
          {agent ? (
            <AgentAvatar
              iconName={agent.iconName}
              bgColor={agent.bgColor}
              size={32}
            />
          ) : null}
          <Box>
            <Text fw={600}>{chat.title}</Text>
            {chat.assistantName && (
              <Text size="xs" c="dimmed">
                {chat.assistantName}
              </Text>
            )}
          </Box>
        </Group>

        {/* messages */}
        <Stack gap="sm" style={{ flex: 1 }}>
          {chat.messages.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}
          {intakeActive && <IntakeFlow agent={agent!} chat={chat} />}
        </Stack>

        {/* composer */}
        <Composer
          value={value}
          onChange={setValue}
          onSubmit={send}
          disabled={intakeActive || busy}
          placeholder={
            intakeActive ? "Answer the questions above to continue…" : "Reply…"
          }
        />
      </Stack>
    </Container>
  );
}

function MessageRow({ message }: { message: Message }) {
  if (message.kind === "schedule-card" && message.scheduledTaskId) {
    return (
      <Stack gap={6}>
        {message.content && <BubbleAssistant text={message.content} />}
        <ScheduleCardWrapper taskId={message.scheduledTaskId} />
      </Stack>
    );
  }
  if (message.kind === "intake-summary") {
    return (
      <Paper withBorder p="sm" radius="md" bg="indigo.0" maw={560}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {message.content}
        </Text>
      </Paper>
    );
  }
  if (message.role === "user") {
    return (
      <Group justify="flex-end">
        <Paper withBorder p="xs" radius="md" bg="indigo.0" maw="80%">
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {message.content}
          </Text>
        </Paper>
      </Group>
    );
  }
  return <BubbleAssistant text={message.content} />;
}

function BubbleAssistant({ text }: { text: string }) {
  return (
    <Group justify="flex-start">
      <Paper withBorder p="xs" radius="md" maw="80%">
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {text}
        </Text>
      </Paper>
    </Group>
  );
}

function ScheduleCardWrapper({ taskId }: { taskId: string }) {
  const task = useStore((s) => s.scheduledTasks.find((t) => t.id === taskId));
  if (!task) return null;
  return <ScheduleCard task={task} compact />;
}
