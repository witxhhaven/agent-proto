"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";
import type {
  Agent,
  Chat,
  IntakeAnswer,
  RenderedQuestion,
} from "@/types";
import { actions } from "@/lib/store";
import { renderQuestion } from "@/lib/structured";
import { createId } from "@/lib/id";
import { LoadingState } from "@/components/common/LoadingState";
import { IntakeQuestionCard } from "./IntakeQuestionCard";

type Status = "idle" | "generating" | "answering" | "error" | "complete";

export function IntakeFlow({ agent, chat }: { agent: Agent; chat: Chat }) {
  // Resume point: skip source questions already answered (persisted on the chat).
  const savedAnswers = chat.intakeAnswers ?? [];
  const answeredSourceIds = new Set(
    savedAnswers.map((a) => a.questionId)
  );
  const initialSourceIndex = (() => {
    let i = 0;
    while (i < agent.questions.length && answeredSourceIds.has(agent.questions[i].id))
      i++;
    return i;
  })();

  const [sourceIndex, setSourceIndex] = useState(initialSourceIndex);
  const [queue, setQueue] = useState<RenderedQuestion[]>([]);
  const [current, setCurrent] = useState<RenderedQuestion | null>(null);
  const [answers, setAnswers] = useState<IntakeAnswer[]>(savedAnswers);
  const [status, setStatus] = useState<Status>("idle");
  // remember answered rendered questions so Back can re-show without re-calling LLM
  const historyRef = useRef<RenderedQuestion[]>([]);

  const finish = useCallback(
    (finalAnswers: IntakeAnswer[]) => {
      const recap = finalAnswers
        .filter((a) => !a.skipped)
        .map(
          (a) =>
            `• ${a.prompt} — ${[...a.selectedOptionLabels, a.freeText]
              .filter(Boolean)
              .join(", ")}`
        )
        .join("\n");
      actions.appendMessage(chat.id, {
        id: createId("msg"),
        role: "assistant",
        content: recap
          ? `Thanks! Here's what I've got:\n${recap}\n\nHow can I help you with this?`
          : "Thanks! Let's get started — how can I help?",
        createdAt: new Date().toISOString(),
        kind: "intake-summary",
      });
      actions.updateChat(chat.id, {
        intakeComplete: true,
        intakeAnswers: finalAnswers,
      });
      setStatus("complete");
    },
    [chat.id]
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
    if (sourceIndex >= agent.questions.length) {
      finish(answers);
      return;
    }
    setStatus("generating");
    try {
      const rendered = await renderQuestion(agent.questions[sourceIndex], {
        agentName: agent.name,
        agentDescription: agent.description,
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
  }, [agent, answers, queue, sourceIndex, finish]);

  // Kick off / continue whenever we're idle with no current question.
  useEffect(() => {
    if (status === "idle" && !current) {
      void advance();
    }
  }, [status, current, advance]);

  function handleAnswer(answer: IntakeAnswer) {
    if (current) historyRef.current.push(current);
    const next = [...answers, answer];
    setAnswers(next);
    actions.updateChat(chat.id, { intakeAnswers: next });
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
    const prev = historyRef.current.pop();
    if (!prev) return;
    const next = answers.slice(0, -1);
    setAnswers(next);
    actions.updateChat(chat.id, { intakeAnswers: next });
    // re-queue current (if any) behind the re-shown previous question
    setQueue((q) => (current ? [current, ...q] : q));
    setCurrent(prev);
    setStatus("answering");
  }

  if (status === "generating" || status === "idle") {
    return <LoadingState title="Preparing your questions…" />;
  }
  if (status === "error") {
    return (
      <Stack gap="sm" maw={560}>
        <Text fw={600}>Couldn&apos;t prepare that question</Text>
        <Text size="sm" c="dimmed">
          Something went wrong generating the next question.
        </Text>
        <Group gap="xs">
          <Button size="xs" onClick={() => setStatus("idle")}>
            Retry
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => {
              setSourceIndex((i) => i + 1);
              setStatus("idle");
            }}
          >
            Skip this question
          </Button>
        </Group>
      </Stack>
    );
  }
  if (status === "complete" || !current) {
    return null;
  }

  return (
    <Stack>
      <IntakeQuestionCard
        question={current}
        onAnswer={handleAnswer}
        onSkip={handleSkip}
        onBack={handleBack}
        canGoBack={historyRef.current.length > 0}
      />
    </Stack>
  );
}
