"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Card, Group, Loader, Paper, Stack, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import type {
  IntakeAnswer,
  IntakeQuestion,
  RenderedQuestion,
  ScheduledTask,
} from "@/types";
import {
  renderQuestion,
  looksLikeSchedule,
  extractSchedule,
  summariseChatForSchedule,
  synthesizeScheduleInstruction,
  generateScheduleTitle,
} from "@/lib/structured";
import { streamComplete } from "@/lib/llm";
import { createId } from "@/lib/id";
import { SCHEDULING_QUESTION_ID } from "@/data/onboarding";
import { LoadingState } from "@/components/common/LoadingState";
import { Composer } from "@/components/chat/Composer";
import { Markdown } from "@/components/chat/Markdown";
import { IntakeQuestionCard } from "@/components/chat/IntakeQuestionCard";
import { renderSchedulingQuestion } from "@/components/chat/IntakeFlow";
import { ScheduleCard } from "@/components/scheduled/ScheduleCard";

interface LocalMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** When set, the message renders an (ephemeral) schedule preview card. */
  task?: ScheduledTask;
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
  greeting?: string;
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
  greeting,
  questions,
}: AgentTestChatProps) {
  const intake = useMemo(
    () => questions.filter((q) => q.prompt.trim()),
    [questions]
  );

  // Starter message: seed the agent's greeting as the first assistant message,
  // mirroring the real chat which shows it before any intake questions.
  const initialMessages = useCallback((): LocalMsg[] => {
    const g = greeting?.trim();
    return g ? [{ id: createId("tmsg"), role: "assistant", text: g }] : [];
  }, [greeting]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [queue, setQueue] = useState<RenderedQuestion[]>([]);
  const [current, setCurrent] = useState<RenderedQuestion | null>(null);
  const [answers, setAnswers] = useState<IntakeAnswer[]>([]);
  const [history, setHistory] = useState<RenderedQuestion[]>([]);
  const [messages, setMessages] = useState<LocalMsg[]>(initialMessages);
  const [status, setStatus] = useState<Status>(
    intake.length > 0 ? "idle" : "complete"
  );
  const [busy, setBusy] = useState(false);
  const [schedulePending, setSchedulePending] = useState(false);
  const [value, setValue] = useState("");

  // Mirror the real chat: pin each new user message to the top of the viewport
  // (a bottom spacer reserves room) instead of always docking to the bottom.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [spacerH, setSpacerH] = useState(0);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  useEffect(() => {
    if (!pinnedId) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-mid="${pinnedId}"]`
    );
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [pinnedId]);

  const addMsg = useCallback((role: LocalMsg["role"], text: string) => {
    const id = createId("tmsg");
    setMessages((m) => [...m, { id, role, text }]);
    return id;
  }, []);

  const addTaskMsg = useCallback((text: string, task: ScheduledTask) => {
    setMessages((m) => [
      ...m,
      { id: createId("tmsg"), role: "assistant", text, task },
    ]);
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
    setMessages(initialMessages());
    setBusy(false);
    setValue("");
    setSpacerH(0);
    setPinnedId(null);
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

      // If the scheduling question was answered with a recurrence, surface a
      // schedule preview card — mirrors the real chat, but the task is ephemeral.
      const schedAnswer =
        answered.find((a) => a.questionId === SCHEDULING_QUESTION_ID) ??
        answered.find((a) => /schedul/i.test(a.prompt));
      const schedText = schedAnswer
        ? [...schedAnswer.selectedOptionLabels, schedAnswer.freeText]
            .filter(Boolean)
            .join(" ")
        : "";
      if (schedText && looksLikeSchedule(schedText)) {
        try {
          const extracted = await extractSchedule(schedText, []);
          if (extracted.isSchedule) {
            setSchedulePending(true);
            const taskAnswers = answered
              .filter(
                (a) =>
                  a.questionId !== SCHEDULING_QUESTION_ID &&
                  !/schedul/i.test(a.prompt)
              )
              .map((a) => ({
                prompt: a.prompt,
                answer: [...a.selectedOptionLabels, a.freeText]
                  .filter(Boolean)
                  .join(", "),
              }));
            const bodyText = await synthesizeScheduleInstruction(
              { name, description, instructions },
              taskAnswers
            );
            const qaHistory = taskAnswers.map((a) => ({
              role: "user" as const,
              content: `${a.prompt}: ${a.answer}`,
            }));
            const schedTitle = await generateScheduleTitle(
              qaHistory,
              name || "the assistant"
            );
            const task: ScheduledTask = {
              id: createId("tmsg-task"),
              title:
                schedTitle ||
                extracted.title ||
                `${name || "Agent"} — scheduled run`,
              instructions: [
                { type: "text", value: bodyText || description || "" },
              ],
              agentId: null,
              knowledgeFileRef: null,
              timing: extracted.timing,
              enabled: true,
              createdAt: new Date().toISOString(),
              lastRun: null,
              runHistory: [],
              origin: "chat",
            };
            setSchedulePending(false);
            addTaskMsg("I've also set this up to run on a schedule:", task);
            await new Promise((r) => setTimeout(r, 400));
          }
        } catch {
          // scheduling is best-effort — never block the intake result
        } finally {
          setSchedulePending(false);
        }
      }

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
          maxTokens: 4096,
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
    [addMsg, addTaskMsg, updateMsg, name, description, instructions]
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
    // The scheduling question renders with concrete, parseable options (same as
    // the real chat), so it always appears and a single pick creates a schedule.
    if (intake[sourceIndex].id === SCHEDULING_QUESTION_ID) {
      setSourceIndex((i) => i + 1);
      setQueue([]);
      setCurrent(renderSchedulingQuestion());
      setStatus("answering");
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
    // Like the real chat, answering does NOT add a user bubble — the cards flow
    // one at a time and the recap appears when intake finishes.
    if (current) setHistory((h) => [...h, current]);
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
    setQueue((q) => (current ? [current, ...q] : q));
    setCurrent(prev);
    setStatus("answering");
  }

  // Free conversation once intake is complete — mirrors the real chat exactly,
  // including the schedule preview (but everything stays ephemeral).
  async function sendFree(text: string) {
    setValue("");
    const userId = addMsg("user", text);
    setSpacerH(scrollRef.current?.clientHeight ?? 0);
    setPinnedId(userId);
    setBusy(true);
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: text },
    ];
    try {
      // Schedule preview — same detection as the real chat, but the card is an
      // in-memory task that is never persisted and never actually runs.
      if (looksLikeSchedule(text)) {
        const extracted = await extractSchedule(text, []);
        if (extracted.isSchedule) {
          setSchedulePending(true);
          const detailed = await summariseChatForSchedule(
            history,
            name || "the assistant"
          );
          const schedTitle = await generateScheduleTitle(
            history,
            name || "the assistant"
          );
          const task: ScheduledTask = {
            id: createId("tmsg-task"),
            title: schedTitle || extracted.title,
            instructions: [{ type: "text", value: detailed }],
            agentId: null,
            knowledgeFileRef: null,
            timing: extracted.timing,
            enabled: true,
            createdAt: new Date().toISOString(),
            lastRun: null,
            runHistory: [],
            origin: "chat",
          };
          addTaskMsg("I've scheduled that for you:", task);
          return;
        }
      }
      const replyId = addMsg("assistant", "");
      let acc = "";
      await streamComplete(history, {
        system: instructions || undefined,
        maxTokens: 4096,
        onDelta: (chunk) => {
          acc += chunk;
          updateMsg(replyId, acc);
        },
      });
      if (!acc) updateMsg(replyId, "(no response)");
    } catch (err) {
      addMsg(
        "assistant",
        `Sorry — the reply failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`
      );
    } finally {
      setBusy(false);
      setSchedulePending(false);
    }
  }

  const intakeActive = status !== "complete";

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 220px)",
        minHeight: 440,
      }}
    >
      <Group justify="space-between" pb="xs">
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

      <Box ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        <Stack gap="md">
          {messages.map((m) =>
            m.role === "user" ? (
              <Group key={m.id} data-mid={m.id} justify="flex-end">
                <Paper withBorder p="sm" radius="md" bg="brand-blue.0" maw="80%">
                  <Text size="md" style={{ whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </Text>
                </Paper>
              </Group>
            ) : m.task ? (
              <Stack key={m.id} data-mid={m.id} gap={8}>
                {m.text && <Markdown>{m.text}</Markdown>}
                <ScheduleCard task={m.task} />
                <Text size="xs" c="dimmed">
                  Preview only — this is a test, so the schedule won&apos;t
                  actually run or be saved.
                </Text>
              </Stack>
            ) : (
              <Box key={m.id} data-mid={m.id}>
                {m.text ? (
                  <Markdown>{m.text}</Markdown>
                ) : (
                  <Group gap={4}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </Group>
                )}
              </Box>
            )
          )}

          {schedulePending && (
            <Card withBorder radius="md" padding="md">
              <Group gap="sm" wrap="nowrap">
                <Loader size="sm" color="brand-blue" />
                <Text size="sm" c="dimmed">
                  Setting up your schedule…
                </Text>
              </Group>
            </Card>
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
        {/* Reserves space so the latest message can scroll to the top. */}
        <div style={{ height: spacerH }} />
      </Box>

      <Box pt="xs">
        <Composer
          value={value}
          onChange={setValue}
          onSubmit={sendFree}
          disabled={intakeActive || busy}
          showTools={false}
          placeholder={
            intakeActive
              ? "Answer the questions above to continue…"
              : "Type a message…"
          }
        />
      </Box>
    </Box>
  );
}
