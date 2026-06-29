"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";
import type {
  Agent,
  Chat,
  InstructionContent,
  IntakeAnswer,
  RenderedQuestion,
} from "@/types";
import { actions, getState } from "@/lib/store";
import { SCHEDULING_QUESTION_ID } from "@/data/onboarding";
import {
  renderQuestion,
  extractSchedule,
  looksLikeSchedule,
  mockExtractSchedule,
  synthesizeScheduleInstruction,
  generateScheduleTitle,
  generateChatTitle,
} from "@/lib/structured";
import { streamComplete } from "@/lib/llm";
import { plainTextToInstruction } from "@/lib/instructions";
import { createId } from "@/lib/id";
import { summariseTitle } from "@/lib/text";
import { LoadingState } from "@/components/common/LoadingState";
import { TypingDots } from "@/components/common/TypingDots";
import { IntakeQuestionCard } from "./IntakeQuestionCard";
import { ToolAccountCard, type ToolStepResult } from "./ToolAccountCard";
import { syncToolStepQuestions } from "@/lib/toolSteps";
import type { ToolStepKind } from "@/types";

type Status =
  | "idle"
  | "generating"
  | "answering"
  | "processing"
  | "error"
  | "complete";

// Back-stack entry: either an answered MCQ or a completed tool step.
type ToolStepRef = { id: string; kind: ToolStepKind; prompt: string };
type HistItem =
  | { kind: "q"; q: RenderedQuestion }
  | { kind: "tool"; step: ToolStepRef };

// Concrete, single-click scheduling options. Each label parses via
// extractSchedule, so picking one is enough to create a schedule. Exported so
// the ephemeral Test tab renders the exact same question.
export function renderSchedulingQuestion(): RenderedQuestion {
  return {
    id: SCHEDULING_QUESTION_ID,
    prompt: "Would you like to run this on a schedule?",
    options: [
      { id: createId("opt"), label: "Every weekday at 8am" },
      { id: createId("opt"), label: "Daily at 9am" },
      { id: createId("opt"), label: "Weekly on Mondays at 9am" },
      { id: createId("opt"), label: "No, run manually" },
    ],
    allowFreeText: true,
    allowMultiple: false,
  };
}

export function IntakeFlow({ agent, chat }: { agent: Agent; chat: Chat }) {
  // The intake sequence = the agent's questions with the email/drive account-step
  // pills folded in (kept in place if already positioned, else added at the start
  // — so legacy/seed agents without saved pills still ask for accounts).
  const questions = useMemo(
    () => syncToolStepQuestions(agent.questions, agent.toolIds),
    [agent.questions, agent.toolIds]
  );

  // Resume point: skip source questions already answered (persisted on the chat).
  const savedAnswers = chat.intakeAnswers ?? [];
  const answeredSourceIds = new Set(
    savedAnswers.map((a) => a.questionId)
  );
  const initialSourceIndex = (() => {
    let i = 0;
    while (i < questions.length && answeredSourceIds.has(questions[i].id)) i++;
    return i;
  })();

  const [sourceIndex, setSourceIndex] = useState(initialSourceIndex);
  const [queue, setQueue] = useState<RenderedQuestion[]>([]);
  const [current, setCurrent] = useState<RenderedQuestion | null>(null);
  // When set, the current intake item is a tool-linked step (rendered as a card).
  const [currentToolStep, setCurrentToolStep] = useState<{
    id: string;
    kind: ToolStepKind;
    prompt: string;
  } | null>(null);
  const [answers, setAnswers] = useState<IntakeAnswer[]>(savedAnswers);
  const [status, setStatus] = useState<Status>("idle");
  // remember answered rendered questions so Back can re-show without re-calling LLM
  const [history, setHistory] = useState<HistItem[]>([]);

  // After the last answer: the agent acknowledges (with a recap), says it's
  // processing, then streams an LLM-generated result. We stay mounted (status
  // "processing", composer stays locked) until the result lands.
  const finish = useCallback(
    async (finalAnswers: IntakeAnswer[]) => {
      setStatus("processing");

      const answered = finalAnswers.filter((a) => !a.skipped);
      const recap = answered
        .map(
          (a) =>
            `- **${a.prompt}** — ${[...a.selectedOptionLabels, a.freeText]
              .filter(Boolean)
              .join(", ")}`
        )
        .join("\n");

      const appendAssistant = (content: string) =>
        actions.appendMessage(chat.id, {
          id: createId("msg"),
          role: "assistant",
          content,
          createdAt: new Date().toISOString(),
          kind: "text",
        });
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // 1. acknowledgment + recap of what they told us
      appendAssistant(
        recap
          ? `Got it, thanks for those details. Here's what I've noted:\n\n${recap}`
          : "Got it, thanks for those details."
      );

      // Thinking indicator: an empty assistant bubble renders the three dots.
      // The title + schedule generation below makes several LLM calls in a row;
      // without this the chat sits silent and looks frozen until everything
      // lands at once. Cleared as soon as the next real bubble is ready.
      const thinkingId = createId("msg");
      actions.appendMessage(chat.id, {
        id: thinkingId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        kind: "text",
      });
      let thinkingCleared = false;
      const clearThinking = () => {
        if (thinkingCleared) return;
        thinkingCleared = true;
        actions.removeMessage(chat.id, thinkingId);
      };

      // Persist answers + chat title now, but keep intake "in progress" so the
      // composer stays disabled until the result is ready.
      const firstAnswer = answered[0];
      const titleSeed = firstAnswer
        ? [...firstAnswer.selectedOptionLabels, firstAnswer.freeText]
            .filter(Boolean)
            .join(", ")
        : agent.name;
      // Synthetic transcript from the answers, for LLM title generation.
      const qaHistory = answered.map((a) => ({
        role: "user" as const,
        content: `${a.prompt}: ${[...a.selectedOptionLabels, a.freeText]
          .filter(Boolean)
          .join(", ")}`,
      }));
      const chatTitle =
        chat.title === "Untitled"
          ? await generateChatTitle(qaHistory, agent.name)
          : chat.title;
      actions.updateChat(chat.id, {
        intakeAnswers: finalAnswers,
        ...(chat.title === "Untitled"
          ? { title: chatTitle || summariseTitle(titleSeed) }
          : {}),
      });

      // If the user answered the onboarding scheduling question with a recurrence,
      // create a schedule that wraps this agent and surface its card in the chat.
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
          let extracted = await extractSchedule(
            schedText,
            getState().agents.map((a) => ({ id: a.id, name: a.name }))
          );
          // The scheduling answer already passed looksLikeSchedule; if the model
          // declines, fall back to the deterministic parse so the schedule is
          // still created rather than silently skipped.
          if (!extracted.isSchedule) extracted = mockExtractSchedule(schedText);
          if (extracted.isSchedule) {
            // Compose the task instruction from the MCQ answers (AI-synthesized,
            // mock fallback), excluding the scheduling answer itself.
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
              {
                name: agent.name,
                description: agent.description,
                instructions: agent.instructions,
              },
              taskAnswers
            );
            // Always lead the instructions with an @mention of the agent being
            // scheduled, followed by the synthesized task text.
            const body = plainTextToInstruction(
              bodyText || agent.description,
              getState().agents
            );
            const instructions: InstructionContent = [
              {
                type: "agent",
                agentId: agent.id,
                name: agent.name,
                iconName: agent.iconName,
                bgColor: agent.bgColor,
              },
              { type: "text", value: " " },
              ...body,
            ];
            const schedTitle = await generateScheduleTitle(qaHistory, agent.name);
            clearThinking();
            const newTask = actions.createScheduledTask({
              title:
                schedTitle ||
                extracted.title ||
                `${agent.name} — scheduled run`,
              instructions,
              agentId: agent.id,
              knowledgeFileRef: null,
              timing: extracted.timing,
              enabled: true,
              origin: "chat",
            });
            actions.appendMessage(chat.id, {
              id: createId("msg"),
              role: "assistant",
              content: "I've also set this up to run on a schedule:",
              createdAt: new Date().toISOString(),
              kind: "schedule-card",
              scheduledTaskId: newTask.id,
            });
            await wait(400);
          }
        } catch {
          // scheduling is best-effort — never block the intake result
        }
      }

      // Clear the thinking bubble (no-op if a schedule was created above) so the
      // "Working on it" message takes its place instead of stacking under it.
      clearThinking();

      await wait(800);

      // 2. "processing" message
      appendAssistant("Working on it — putting this together for you now…");

      await wait(400);

      // 3. loading bubble (empty assistant message renders dots) + streamed result
      const resultId = createId("msg");
      actions.appendMessage(chat.id, {
        id: resultId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        kind: "text",
      });

      const resultPrompt = `The user completed an intake form with these answers:\n${
        recap || "(no answers provided)"
      }\n\nUsing this information, carry out your task and give the user the result now.`;

      try {
        let acc = "";
        await streamComplete([{ role: "user", content: resultPrompt }], {
          system: agent.instructions || undefined,
          maxTokens: 700,
          onDelta: (chunk) => {
            acc += chunk;
            actions.updateMessage(chat.id, resultId, { content: acc });
          },
        });
        if (!acc) {
          actions.updateMessage(chat.id, resultId, {
            content:
              "Here's a summary based on what you shared. Let me know if you'd like me to adjust anything.",
          });
        }
      } catch {
        actions.updateMessage(chat.id, resultId, {
          content:
            "Sorry — I couldn't generate that just now. You can ask me again below.",
        });
      }

      // 4. done — re-enable the composer for follow-ups
      actions.updateChat(chat.id, { intakeComplete: true });
      setStatus("complete");
    },
    [
      chat.id,
      chat.title,
      agent.id,
      agent.name,
      agent.description,
      agent.instructions,
      agent.iconName,
      agent.bgColor,
    ]
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
    if (sourceIndex >= questions.length) {
      void finish(answers);
      return;
    }
    const source = questions[sourceIndex];
    // Tool-linked pill entries render an inline ToolAccountCard at their spot.
    if (source.toolStep) {
      setSourceIndex((i) => i + 1);
      setQueue([]);
      setCurrentToolStep({
        id: source.id,
        kind: source.toolStep,
        prompt: source.prompt,
      });
      setStatus("answering");
      return;
    }
    // The onboarding scheduling question is rendered deterministically with
    // concrete, parseable options so it always appears (even when the real LLM
    // would otherwise reword it). The chosen answer is still parsed by AI.
    if (source.id === SCHEDULING_QUESTION_ID) {
      setSourceIndex((i) => i + 1);
      setQueue([]);
      setCurrent(renderSchedulingQuestion());
      setStatus("answering");
      return;
    }
    setStatus("generating");
    try {
      const rendered = await renderQuestion(source, {
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
  }, [agent, questions, answers, queue, sourceIndex, finish]);

  // Kick off / continue whenever we're idle with no current question. Deferred a
  // tick so the async loader's state updates happen outside the effect body.
  useEffect(() => {
    if (status !== "idle" || current) return;
    const id = setTimeout(() => void advance(), 0);
    return () => clearTimeout(id);
  }, [status, current, advance]);

  // Record a completed tool-linked step (rendered inline at its position),
  // persist it, and continue the intake.
  function submitToolStep(result: ToolStepResult) {
    if (!currentToolStep) return;
    const answer: IntakeAnswer = {
      questionId: currentToolStep.id,
      prompt: currentToolStep.prompt,
      selectedOptionLabels: [
        result.account,
        ...(result.keywords ?? []),
        ...(result.recipients ?? []),
        ...(result.folder ? [result.folder] : []),
      ],
    };
    const next = [...answers, answer];
    setHistory((h) => [...h, { kind: "tool", step: currentToolStep }]);
    setAnswers(next);
    actions.updateChat(chat.id, { intakeAnswers: next });
    setCurrentToolStep(null);
    setStatus("idle");
  }

  // Skip the current tool step (record it skipped) and continue.
  function handleToolSkip() {
    if (!currentToolStep) return;
    const next = [
      ...answers,
      {
        questionId: currentToolStep.id,
        prompt: currentToolStep.prompt,
        selectedOptionLabels: [],
        skipped: true,
      },
    ];
    setHistory((h) => [...h, { kind: "tool", step: currentToolStep }]);
    setAnswers(next);
    actions.updateChat(chat.id, { intakeAnswers: next });
    setCurrentToolStep(null);
    setStatus("idle");
  }

  // Skip this tool step and everything remaining, then go to the result.
  function handleToolSkipAll() {
    if (!currentToolStep) return;
    const skip = (q: { id: string; prompt: string }): IntakeAnswer => ({
      questionId: q.id,
      prompt: q.prompt,
      selectedOptionLabels: [],
      skipped: true,
    });
    const finalAnswers = [
      ...answers,
      skip(currentToolStep),
      ...queue.map(skip),
      ...questions.slice(sourceIndex).map(skip),
    ];
    setCurrentToolStep(null);
    setQueue([]);
    setAnswers(finalAnswers);
    void finish(finalAnswers);
  }

  function handleAnswer(answer: IntakeAnswer) {
    if (current) setHistory((h) => [...h, { kind: "q", q: current }]);
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

  // Skip the current question, any queued follow-ups, and all remaining source
  // questions — marking each as skipped — then go straight to the result.
  function handleSkipAll() {
    const skip = (q: { id: string; prompt: string }): IntakeAnswer => ({
      questionId: q.id,
      prompt: q.prompt,
      selectedOptionLabels: [],
      skipped: true,
    });
    const remaining: IntakeAnswer[] = [
      ...(current ? [skip(current)] : []),
      ...queue.map(skip),
      ...questions.slice(sourceIndex).map(skip),
    ];
    const finalAnswers = [...answers, ...remaining];
    setCurrent(null);
    setQueue([]);
    setAnswers(finalAnswers);
    void finish(finalAnswers);
  }

  function handleBack() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    const next = answers.slice(0, -1);
    setAnswers(next);
    actions.updateChat(chat.id, { intakeAnswers: next });
    // Stash whatever is currently shown so it reappears after: questions go back
    // on the queue; tool steps are re-shown by re-pointing at their pill.
    if (current) setQueue((q) => [current, ...q]);
    else if (currentToolStep) setSourceIndex((s) => s - 1);
    if (prev.kind === "q") {
      setCurrent(prev.q);
      setCurrentToolStep(null);
    } else {
      setCurrentToolStep(prev.step);
      setCurrent(null);
    }
    setStatus("answering");
  }

  // Account step rendered inline at its position in the question sequence.
  if (currentToolStep) {
    return (
      <Stack maw={560}>
        <ToolAccountCard
          key={currentToolStep.id}
          kind={currentToolStep.kind}
          prompt={currentToolStep.prompt}
          toolIds={agent.toolIds}
          onComplete={submitToolStep}
          onSkip={handleToolSkip}
          onSkipAll={handleToolSkipAll}
          onBack={handleBack}
          canGoBack={history.length > 0}
        />
      </Stack>
    );
  }

  if (status === "generating" || status === "idle") {
    // Right after the hardcoded scheduling MCQ is answered, show the same
    // three-dot "thinking" indicator as the chat (rather than the spinner)
    // before the result streams in.
    const lastAnswer = answers[answers.length - 1];
    if (
      status === "idle" &&
      lastAnswer?.questionId === SCHEDULING_QUESTION_ID
    ) {
      return (
        <Stack gap={6}>
          <TypingDots />
        </Stack>
      );
    }
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
  if (status === "processing" || status === "complete" || !current) {
    return null;
  }

  return (
    <Stack maw={560}>
      <IntakeQuestionCard
        question={current}
        onAnswer={handleAnswer}
        onSkip={handleSkip}
        onSkipAll={handleSkipAll}
        onBack={handleBack}
        canGoBack={history.length > 0}
      />
    </Stack>
  );
}
