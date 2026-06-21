"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type { InstructionContent, Message } from "@/types";
import { actions, agentFromAssistant, getState, useStore } from "@/lib/store";
import { createId } from "@/lib/id";
import { plainTextToInstruction } from "@/lib/instructions";
import {
  extractSchedule,
  looksLikeSchedule,
  mockExtractSchedule,
  summariseChatForSchedule,
} from "@/lib/structured";
import { streamComplete } from "@/lib/llm";
import { summariseTitle } from "@/lib/text";
import { AgentAvatar } from "@/components/common/AgentAvatar";
import { Composer } from "./Composer";
import { Markdown } from "./Markdown";
import { IntakeFlow } from "./IntakeFlow";
import { ScheduleCard } from "@/components/scheduled/ScheduleCard";

export function ChatView({ chatId }: { chatId: string }) {
  const router = useRouter();
  const chat = useStore((s) => s.chats.find((c) => c.id === chatId));
  // Only agents you own are editable; resolved from state.agents.
  const ownedAgent = useStore((s) =>
    chat?.agentId ? s.agents.find((a) => a.id === chat.agentId) : undefined
  );
  // Marketplace assistants aren't in state.agents — fall back to the assistant so
  // its greeting + onboarding questions still drive the chat.
  const assistant = useStore((s) =>
    chat?.agentId ? s.assistants.find((a) => a.id === chat.agentId) : undefined
  );
  const agent = useMemo(
    () => ownedAgent ?? (assistant ? agentFromAssistant(assistant) : undefined),
    [ownedAgent, assistant]
  );
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [spacerH, setSpacerH] = useState(0);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // ChatGPT/Claude-style: when a new user message is sent, scroll it to the top
  // of the viewport (the bottom spacer guarantees there's room) and let the reply
  // stream in below — instead of always docking to the bottom.
  useEffect(() => {
    if (!pinnedId) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-mid="${pinnedId}"]`
    );
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [pinnedId]);

  // Greeting: if the agent has a greeting message, seed it as the first assistant
  // message when the chat starts (before any intake questions). Blank = no opener.
  useEffect(() => {
    if (!chat || !agent) return;
    const greeting = agent.greeting?.trim();
    if (!greeting) return;
    const fresh = getState().chats.find((c) => c.id === chat.id);
    if (!fresh || fresh.messages.length > 0) return;
    actions.appendMessage(chat.id, {
      id: createId("msg"),
      role: "assistant",
      content: greeting,
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
        // Name pool for linking: owned agents + marketplace assistants (deduped,
        // since an owned agent also appears as an assistant).
        const named = new Map<string, { id: string; name: string }>();
        for (const a of getState().agents) named.set(a.id, { id: a.id, name: a.name });
        for (const a of getState().assistants)
          if (!named.has(a.id)) named.set(a.id, { id: a.id, name: a.name });
        const agents = [...named.values()];
        // The heuristic already fired, so this IS schedule-ish. If the model
        // declines (or there's no key), fall back to the deterministic parse so
        // the schedule card reliably surfaces instead of being silently dropped.
        let extracted = await extractSchedule(text, agents);
        if (!extracted.isSchedule) extracted = mockExtractSchedule(text, agents);
        if (extracted.isSchedule) {
          // Document the whole conversation into detailed instructions so the
          // scheduled task captures everything discussed, not just this line.
          const convo = (getState().chats.find((c) => c.id === chat!.id)?.messages ?? [])
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role:
                m.role === "assistant"
                  ? ("assistant" as const)
                  : ("user" as const),
              content: m.content,
            }));
          const detailed = await summariseChatForSchedule(
            convo,
            agent?.name ?? "the assistant"
          );
          // Lead the instructions with an @mention of the agent involved (the
          // chat's agent, else any agent named in the message), then the summary.
          const mentionAgent =
            agent ??
            (extracted.agentId
              ? getState().agents.find((a) => a.id === extracted.agentId)
              : undefined);
          const body = plainTextToInstruction(detailed, getState().agents);
          const instructions: InstructionContent = mentionAgent
            ? [
                {
                  type: "agent",
                  agentId: mentionAgent.id,
                  name: mentionAgent.name,
                  iconName: mentionAgent.iconName,
                  bgColor: mentionAgent.bgColor,
                },
                { type: "text", value: " " },
                ...body,
              ]
            : body;
          const task = actions.createScheduledTask({
            title: extracted.title,
            instructions,
            agentId: mentionAgent?.id ?? extracted.agentId ?? null,
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
          maxTokens: 4096, // allow full-length replies (avoid mid-sentence cut-off)
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
    // Pin the new message to the top, reserving a viewport of space below it.
    setSpacerH(scrollRef.current?.clientHeight ?? 0);
    setPinnedId(userId);
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
          {ownedAgent && (
            <Button
              variant="default"
              size="sm"
              leftSection={<IconPencil size={16} />}
              onClick={() => router.push(`/agents/${ownedAgent.id}`)}
            >
              Edit
            </Button>
          )}
        </Group>
      </Box>

      {/* messages — scrollable, flowing from the top */}
      <Box ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        <Container size="md" py="lg">
          <Stack gap="lg">
            {chat.messages.map((m) => (
              <div key={m.id} data-mid={m.id}>
                <MessageRow message={m} />
              </div>
            ))}
            {intakeActive && <IntakeFlow agent={agent!} chat={chat} />}
            {showStandaloneLoader && <AssistantMessage text="" />}
          </Stack>
          {/* Reserves space so the latest message can scroll to the top. */}
          <div style={{ height: spacerH }} />
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
      <Stack gap={8}>
        {message.content && <AssistantMessage text={message.content} />}
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
  return <AssistantMessage text={message.content} />;
}

/** Borderless, full content-width assistant message (no avatar/name header). */
function AssistantMessage({ text }: { text: string }) {
  return <Stack gap={6}>{text ? <Markdown>{text}</Markdown> : <Dots />}</Stack>;
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
