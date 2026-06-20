"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import type { Message } from "@/types";
import { actions, getState, useStore } from "@/lib/store";
import { createId } from "@/lib/id";
import { extractSchedule, looksLikeSchedule } from "@/lib/structured";
import { streamComplete } from "@/lib/llm";
import { summariseTitle } from "@/lib/text";
import { AgentAvatar } from "@/components/common/AgentAvatar";
import { Composer } from "./Composer";
import { IntakeFlow } from "./IntakeFlow";
import { ScheduleCard } from "@/components/scheduled/ScheduleCard";

export function ChatView({ chatId }: { chatId: string }) {
  const router = useRouter();
  const chat = useStore((s) => s.chats.find((c) => c.id === chatId));
  const agent = useStore((s) =>
    chat?.agentId ? s.agents.find((a) => a.id === chat.agentId) : undefined
  );
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the thread pinned to the bottom as messages arrive / stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat?.messages, busy]);

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

  // Auto-reply: when the thread's last message is an unanswered user message
  // (e.g. just arrived from the home composer), generate the reply without
  // making the user send again. Each user message is answered at most once.
  const handledUserMsg = useRef<string | null>(null);
  useEffect(() => {
    if (!chat || busy) return;
    const active =
      !!agent && agent.questions.length > 0 && !chat.intakeComplete;
    if (active) return; // intake flow drives its own responses
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "user") return;
    if (handledUserMsg.current === last.id) return;
    handledUserMsg.current = last.id;
    void respond(last.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.messages, chat?.intakeComplete, agent, busy]);

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
    const id = createId("msg");
    actions.appendMessage(chat!.id, {
      id,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      kind: "text",
    });
    return id;
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

  // Generate the AI reply for a message that is ALREADY in the thread. Split out
  // from send() so it can be triggered both by typing here and by arriving from
  // the home composer (which appends the user message before navigating).
  async function respond(text: string) {
    setBusy(true);
    try {
      // 1. schedule extraction — only run the (slower) LLM extractor when the
      // message actually looks like a scheduling request, so normal chats skip
      // the extra round-trip entirely.
      if (looksLikeSchedule(text)) {
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
      }
      // 2. normal reply — streamed token-by-token into a placeholder bubble so
      // it appears immediately. Falls back to the mock reply without a key.
      const history = (getState().chats.find((c) => c.id === chat!.id)?.messages ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));
      const replyId = createId("msg");
      actions.appendMessage(chat!.id, {
        id: replyId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        kind: "text",
      });
      try {
        let acc = "";
        await streamComplete(history, {
          system: agent?.instructions || undefined,
          maxTokens: 512, // cap reply length so it finishes sooner
          onDelta: (chunk) => {
            acc += chunk;
            actions.updateMessage(chat!.id, replyId, { content: acc });
          },
        });
        if (!acc) {
          actions.updateMessage(chat!.id, replyId, { content: "(no response)" });
        }
      } catch (err) {
        actions.updateMessage(chat!.id, replyId, {
          content: `Sorry — the reply failed: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  function send(text: string) {
    setValue("");
    const userId = appendUser(text);
    handledUserMsg.current = userId; // we'll answer it below; don't double-fire
    // Summarise the title from the first user message while it's still "Untitled".
    if (chat!.title === "Untitled") {
      actions.updateChat(chat!.id, { title: summariseTitle(text) });
    }
    void respond(text);
  }

  const subtitle = chat.assistantName ?? agent?.name ?? "My AI Assistant";

  // An empty assistant bubble means a streamed reply is in flight (it renders
  // its own dots). Show a standalone indicator for the pre-stream gap (e.g.
  // schedule extraction) so there's always feedback while busy.
  const lastMsg = chat.messages[chat.messages.length - 1];
  const streamingPlaceholder =
    !!lastMsg && lastMsg.role === "assistant" && lastMsg.content === "";
  const showStandaloneLoader = busy && !streamingPlaceholder && !intakeActive;

  return (
    <Box
      style={{
        height: "calc(100dvh - var(--app-shell-header-height, 0px))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
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
          {agent && (
            <Button
              variant="default"
              size="sm"
              leftSection={<IconPencil size={16} />}
              onClick={() => router.push(`/agents/${agent.id}`)}
            >
              Edit
            </Button>
          )}
        </Group>
      </Box>

      {/* messages — scrollable, docked to the bottom */}
      <Box ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
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
            {showStandaloneLoader && <TypingIndicator />}
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
        {text ? (
          <Text size="md" style={{ whiteSpace: "pre-wrap" }}>
            {text}
          </Text>
        ) : (
          <Dots />
        )}
      </Paper>
    </Group>
  );
}

/** Standalone "assistant is thinking" bubble (used before streaming starts). */
function TypingIndicator() {
  return (
    <Group justify="flex-start">
      <Paper withBorder p="sm" radius="md">
        <Dots />
      </Paper>
    </Group>
  );
}

function Dots() {
  return (
    <Group gap={4} align="center" h={20}>
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </Group>
  );
}

function ScheduleCardWrapper({ taskId }: { taskId: string }) {
  const task = useStore((s) => s.scheduledTasks.find((t) => t.id === taskId));
  if (!task) return null;
  return <ScheduleCard task={task} compact />;
}
