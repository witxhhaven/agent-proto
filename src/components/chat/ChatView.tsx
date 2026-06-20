"use client";

import { useEffect, useState } from "react";
import { Badge, Box, Container, Group, Paper, Stack, Text } from "@mantine/core";
import type { Message } from "@/types";
import { actions, getState, useStore } from "@/lib/store";
import { createId } from "@/lib/id";
import { extractSchedule } from "@/lib/structured";
import { complete } from "@/lib/llm";
import { summariseTitle } from "@/lib/text";
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

  // Auto-greeting: for an agent chat with no intake questions that's still empty,
  // seed an opening assistant message so the bottom-aligned thread isn't blank.
  useEffect(() => {
    if (!chat || !agent) return;
    if (agent.questions.length > 0) return; // intake flow handles the opener
    const fresh = getState().chats.find((c) => c.id === chat.id);
    if (!fresh || fresh.messages.length > 0) return;
    actions.appendMessage(chat.id, {
      id: createId("msg"),
      role: "assistant",
      content: `Hi! I'm ${agent.name}. ${agent.description} What would you like help with?`,
      createdAt: new Date().toISOString(),
      kind: "text",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id, agent?.id]);

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
    // Summarise the title from the first user message while it's still "Untitled".
    if (chat!.title === "Untitled") {
      actions.updateChat(chat!.id, { title: summariseTitle(text) });
    }
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
      // 2. normal reply via /api/llm — uses the real Claude call when a key is
      // present, and falls back to the deterministic mock string otherwise.
      const history = (getState().chats.find((c) => c.id === chat!.id)?.messages ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));
      const res = await complete(history, agent?.instructions || undefined);
      if (res.mock) {
        appendAssistant(
          `Here's a response to "${text.slice(0, 60)}". (mock — add an API key for real replies)`
        );
      } else if (res.text) {
        appendAssistant(res.text);
      } else {
        appendAssistant(
          res.error ? `Sorry — the reply failed: ${res.error}` : "(no response)"
        );
      }
    } catch (err) {
      appendAssistant(
        `Sorry — the reply failed: ${err instanceof Error ? err.message : "unknown error"}`
      );
    } finally {
      setBusy(false);
    }
  }

  const subtitle = chat.assistantName ?? agent?.name ?? "My AI Assistant";

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* full-width header with grey bottom border */}
      <Box
        px="xl"
        py="md"
        style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
      >
        <Group gap="sm" wrap="nowrap" align="center">
          {agent && (
            <AgentAvatar
              iconName={agent.iconName}
              bgColor={agent.bgColor}
              imageUrl={agent.imageUrl}
              size={36}
            />
          )}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Text fw={600} lineClamp={1}>
                {chat.title}
              </Text>
              <Badge variant="light" color="brand-blue" size="sm" radius="sm">
                CCE/SN
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {subtitle}
            </Text>
          </Box>
        </Group>
      </Box>

      {/* messages — scrollable, docked to the bottom */}
      <Box style={{ flex: 1, overflowY: "auto" }}>
        <Container
          size="md"
          py="lg"
          style={{
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack gap="sm" style={{ marginTop: "auto" }}>
            {chat.messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {intakeActive && <IntakeFlow agent={agent!} chat={chat} />}
          </Stack>
        </Container>
      </Box>

      {/* composer */}
      <Box pb="lg" pt="xs">
        <Container size="md">
          <Composer
            value={value}
            onChange={setValue}
            onSubmit={send}
            disabled={intakeActive || busy}
            placeholder={
              intakeActive ? "Answer the questions above to continue…" : "Reply…"
            }
          />
        </Container>
      </Box>
    </Box>
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
      <Paper withBorder p="sm" radius="md" bg="brand-blue.0" maw={560}>
        <Text size="md" style={{ whiteSpace: "pre-wrap" }}>
          {message.content}
        </Text>
      </Paper>
    );
  }
  if (message.role === "user") {
    return (
      <Group justify="flex-end">
        <Paper withBorder p="sm" radius="md" bg="brand-blue.0" maw={640}>
          <Text size="md" style={{ whiteSpace: "pre-wrap" }}>
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
      <Paper withBorder p="sm" radius="md" maw={640}>
        <Text size="md" style={{ whiteSpace: "pre-wrap" }}>
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
