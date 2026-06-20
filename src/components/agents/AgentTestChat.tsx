"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import type { IntakeAnswer, IntakeQuestion, RenderedQuestion } from "@/types";
import { renderQuestion } from "@/lib/structured";
import { streamComplete } from "@/lib/llm";
import { createId } from "@/lib/id";
import { LoadingState } from "@/components/common/LoadingState";
import { Composer } from "@/components/chat/Composer";
import { IntakeQuestionCard } from "@/components/chat/IntakeQuestionCard";

interface LocalMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

type Status =
  | "idle"
  | "generating"
  | "answering"
  | "processing"
  | "error"
  | "complete";

export interface AgentTestChatProps {
  name: string;
  description: string;
  instructions: string;
  questions: IntakeQuestion[];
}

/**
 * EPHEMERAL test chat. Reuses the real chat's intake cards (IntakeQuestionCard +
 * renderQuestion) so you see the same MCQ cards and answer them the same way —
 * but the whole flow is driven by local state and NEVER written to the store.
 */
export function AgentTestChat({
  name,
  description,
  instructions,
  questions,
}: AgentTestChatProps) {
  const intake = useMemo(
    () => questions.filter((q) => q.prompt.trim()),
    [questions]
  );

  const [sourceIndex, setSourceIndex] = useState(0);
  const [queue, setQueue] = useState<RenderedQuestion[]>([]);
  const [current, setCurrent] = useState<RenderedQuestion | null>(null);
  const [answers, setAnswers] = useState<IntakeAnswer[]>([]);
  const [history, setHistory] = useState<RenderedQuestion[]>([]);
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [status, setStatus] = useState<Status>(
    intake.length > 0 ? "idle" : "complete"
  );
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, current, busy, status]);

  const addMsg = useCallback((role: LocalMsg["role"], text: string) => {
    const id = createId("tmsg");
    setMessages((m) => [...m, { id, role, text }]);
    return id;
  }, []);

  const updateMsg = useCallback((id: string, text: string) => {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text } : msg)));
  }, []);

  const answerText = (a: IntakeAnswer) =>
    a.skipped
      ? "(skipped)"
      : [...a.selectedOptionLabels, a.freeText].filter(Boolean).join(", ");

  function restart() {
    setSourceIndex(0);
    setQueue([]);
    setCurrent(null);
    setAnswers([]);
    setHistory([]);
    setMessages([]);
    setBusy(false);
    setValue("");
    setStatus(intake.length > 0 ? "idle" : "complete");
  }

  // After the last answer: acknowledge with a recap, then stream a result —
  // mirrors the real IntakeFlow, but into local messages instead of the store.
  const finish = useCallback(
    async (finalAnswers: IntakeAnswer[]) => {
      setStatus("processing");
      const answered = finalAnswers.filter((a) => !a.skipped);
      const recap = answered
        .map((a) => `• ${a.prompt} — ${answerText(a)}`)
        .join("\n");

      addMsg(
        "assistant",
        recap
          ? `Got it, thanks for those details. Here's what I've noted:\n${recap}`
          : "Got it, thanks for those details."
      );
      await new Promise((r) => setTimeout(r, 600));
      addMsg("assistant", "Working on it — putting this together for you now…");
      await new Promise((r) => setTimeout(r, 300));

      const resultId = addMsg("assistant", "");
      const resultPrompt = `The user completed an intake form with these answers:\n${
        recap || "(no answers provided)"
      }\n\nUsing this information, carry out your task and give the user the result now.`;
      try {
        let acc = "";
        await streamComplete([{ role: "user", content: resultPrompt }], {
          system: instructions || undefined,
          maxTokens: 700,
          onDelta: (chunk) => {
            acc += chunk;
            updateMsg(resultId, acc);
          },
        });
        if (!acc) {
          updateMsg(
            resultId,
            "Here's a summary based on what you shared. Let me know if you'd like me to adjust anything."
          );
        }
      } catch {
        updateMsg(
          resultId,
          "Sorry — I couldn't generate that just now. You can ask me again below."
        );
      }
      setStatus("complete");
    },
    [addMsg, updateMsg, instructions]
  );

  // Pull the next question: drain the queue, else render the next source question.
  const advance = useCallback(async () => {
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setCurrent(next);
      setStatus("answering");
      return;
    }
    if (sourceIndex >= intake.length) {
      void finish(answers);
      return;
    }
    setStatus("generating");
    try {
      const rendered = await renderQuestion(intake[sourceIndex], {
        agentName: name,
        agentDescription: description,
        priorAnswers: answers,
      });
      setSourceIndex((i) => i + 1);
      const [next, ...rest] = rendered;
      setQueue(rest);
      setCurrent(next);
      setStatus("answering");
    } catch {
      setStatus("error");
    }
  }, [queue, sourceIndex, intake, answers, finish, name, description]);

  useEffect(() => {
    if (status !== "idle" || current) return;
    const id = setTimeout(() => void advance(), 0);
    return () => clearTimeout(id);
  }, [status, current, advance]);

  function handleAnswer(answer: IntakeAnswer) {
    if (current) setHistory((h) => [...h, current]);
    addMsg("user", answerText(answer));
    setAnswers((a) => [...a, answer]);
    setCurrent(null);
    setStatus("idle");
  }

  function handleSkip() {
    if (!current) return;
    handleAnswer({
      questionId: current.id,
      prompt: current.prompt,
      selectedOptionLabels: [],
      skipped: true,
    });
  }

  function handleBack() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setAnswers((a) => a.slice(0, -1));
    setMessages((m) => m.slice(0, -1)); // drop the last user answer bubble
    setQueue((q) => (current ? [current, ...q] : q));
    setCurrent(prev);
    setStatus("answering");
  }

  // Free conversation once intake is complete — streamed like the real chat.
  async function sendFree(text: string) {
    setValue("");
    addMsg("user", text);
    setBusy(true);
    const history = [...messages, { id: "", role: "user" as const, text }]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.text }));
    const replyId = addMsg("assistant", "");
    try {
      let acc = "";
      await streamComplete(history, {
        system: instructions || undefined,
        maxTokens: 512,
        onDelta: (chunk) => {
          acc += chunk;
          updateMsg(replyId, acc);
        },
      });
      if (!acc) updateMsg(replyId, "(no response)");
    } catch (err) {
      updateMsg(
        replyId,
        `Sorry — the reply failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  const intakeActive = status !== "complete";

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

      <Box ref={scrollRef} style={{ overflowY: "auto", maxHeight: "60vh" }}>
        <Stack gap="sm">
          {messages.map((m) =>
            m.role === "user" ? (
              <Group key={m.id} justify="flex-end">
                <Paper withBorder p="sm" radius="md" bg="brand-blue.0" maw="80%">
                  <Text size="md" style={{ whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </Text>
                </Paper>
              </Group>
            ) : (
              <Group key={m.id} justify="flex-start">
                <Paper withBorder p="sm" radius="md" maw="80%">
                  {m.text ? (
                    <Text size="md" style={{ whiteSpace: "pre-wrap" }}>
                      {m.text}
                    </Text>
                  ) : (
                    <Group gap={4}>
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </Group>
                  )}
                </Paper>
              </Group>
            )
          )}

          {(status === "generating" || status === "idle") &&
            intake.length > 0 && (
              <LoadingState title="Preparing your questions…" />
            )}

          {status === "error" && (
            <Stack gap="sm" maw={560}>
              <Text fw={600}>Couldn&apos;t prepare that question</Text>
              <Text size="sm" c="dimmed">
                Something went wrong generating the next question.
              </Text>
              <Button size="xs" w="fit-content" onClick={() => setStatus("idle")}>
                Retry
              </Button>
            </Stack>
          )}

          {status === "answering" && current && (
            <IntakeQuestionCard
              question={current}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
              onBack={handleBack}
              canGoBack={history.length > 0}
            />
          )}
        </Stack>
      </Box>

      <Box style={{ marginTop: "auto" }}>
        <Composer
          value={value}
          onChange={setValue}
          onSubmit={sendFree}
          disabled={intakeActive || busy}
          showClassification={false}
          placeholder={
            intakeActive
              ? "Answer the questions above to continue…"
              : "Type a message…"
          }
        />
      </Box>
    </Stack>
  );
}
