"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import type { AssistMessage, IntakeQuestion } from "@/types";
import type { AgentDraft } from "@/lib/agentDraft";
import { actions, useStore } from "@/lib/store";
import { assistAgentChat } from "@/lib/structured";
import { createId } from "@/lib/id";

// Stable empty reference so the store selector never returns a fresh array.
const EMPTY: AssistMessage[] = [];

export interface AiAssistDrawerProps {
  /** Agent id this conversation belongs to — history is persisted under it. */
  assistKey: string;
  currentQuestions: IntakeQuestion[];
  /** Merge the AI's draft into the agent form. Should NOT close the drawer. */
  onApply: (draft: AgentDraft) => void;
  /** When provided, auto-submitted as the first message on mount. */
  initialMessage?: string;
  /** Notifies the parent while an AI response is in flight (e.g. to overlay the form). */
  onLoadingChange?: (loading: boolean) => void;
}

/**
 * Conversational AI-assist panel. The creator describes the agent; each turn the
 * assistant fills the form (via onApply) as much as it can and replies with
 * clarifying questions. A composer is pinned to the bottom, chat-style.
 * Mock-first (works with no API key); real Claude when a key is present.
 */
export function AiAssistDrawer({
  assistKey,
  currentQuestions,
  onApply,
  initialMessage,
  onLoadingChange,
}: AiAssistDrawerProps) {
  // History is persisted per agent in the store, so it survives closing the
  // drawer and is distinct for each agent.
  const messages = useStore((s) => s.assistChats[assistKey] ?? EMPTY);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: AssistMessage = {
      id: createId("m"),
      role: "user",
      content: trimmed,
    };
    const history = [...messages, userMsg];
    actions.appendAssistMessage(assistKey, userMsg);
    setInput("");
    setLoading(true);
    try {
      const result = await assistAgentChat(
        history.map((m) => ({ role: m.role, content: m.content })),
        currentQuestions
      );
      onApply({
        name: result.name,
        description: result.description,
        instructions: result.instructions,
        toolIds: result.toolIds,
        questions: result.questions ?? [],
      });
      actions.appendAssistMessage(assistKey, {
        id: createId("m"),
        role: "assistant",
        content: result.reply,
      });
    } catch {
      actions.appendAssistMessage(assistKey, {
        id: createId("m"),
        role: "assistant",
        content:
          "Sorry — I couldn't draft that just now. Try rephrasing or adding more detail.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit the seed description once — but only for a fresh conversation,
  // so reopening an agent with existing history doesn't re-fire it.
  useEffect(() => {
    if (initialMessage && !startedRef.current && messages.length === 0) {
      startedRef.current = true;
      void send(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Mirror the in-flight state up so the parent can overlay the form.
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Clear the parent's loading flag if the drawer unmounts mid-request.
  useEffect(() => {
    return () => onLoadingChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack gap={0} style={{ height: "100%" }}>
      <Box style={{ flex: 1, overflowY: "auto" }}>
        <Stack gap="sm" pb="md">
          {messages.length === 0 && !loading && (
            <Text size="sm" c="dimmed">
              I&apos;ll turn your description into settings and intake questions,
              then help you refine.
            </Text>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {loading && (
            <Group gap={8} px="xs">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">
                Thinking…
              </Text>
            </Group>
          )}
          <div ref={endRef} />
        </Stack>
      </Box>

      {/* Pinned composer */}
      <Box pt="sm" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
        <Paper withBorder radius="lg" p={6} shadow="xs">
          <Textarea
            placeholder="Reply to refine your agent…"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            variant="unstyled"
            autosize
            minRows={1}
            maxRows={6}
            px="xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <Group justify="flex-end" mt={4}>
            <ActionIcon
              size="lg"
              radius="xl"
              aria-label="Send"
              disabled={!input.trim() || loading}
              onClick={() => void send(input)}
            >
              <IconArrowUp size={18} />
            </ActionIcon>
          </Group>
        </Paper>
      </Box>
    </Stack>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <Group justify={isUser ? "flex-end" : "flex-start"} gap={0}>
      <Paper
        radius="lg"
        p="sm"
        bg={isUser ? "ink.9" : "gray.1"}
        style={{ maxWidth: "85%" }}
      >
        <Text
          size="sm"
          c={isUser ? "white" : undefined}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {content}
        </Text>
      </Paper>
    </Group>
  );
}
