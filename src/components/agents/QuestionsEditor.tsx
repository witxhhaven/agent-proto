"use client";

import { useState } from "react";
import { Stack, Text, Textarea } from "@mantine/core";
import type { IntakeQuestion } from "@/types";
import { createId } from "@/lib/id";

export interface QuestionsEditorProps {
  questions: IntakeQuestion[];
  onChange: (questions: IntakeQuestion[]) => void;
}

/**
 * Splits free-typed text into separate questions. A question ends at a "?" or a
 * newline, so the user can type one question and keep going with the next on the
 * same line ("What's the goal? Who's it for?") or across wrapped lines.
 */
function parseQuestions(text: string): string[] {
  return text
    .split(/\n|(?<=\?)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function QuestionsEditor({
  questions,
  onChange,
}: QuestionsEditorProps) {
  // The textarea owns the raw text so typing is never reformatted under the
  // cursor; we parse it into questions in the background.
  const [raw, setRaw] = useState(() =>
    questions.map((q) => q.prompt).join("\n")
  );

  // Re-sync the raw text when questions change from outside (e.g. AI generate).
  // Done during render (React's "adjust state on prop change" pattern) rather
  // than in an effect, so it never reformats text the user just typed.
  const [seen, setSeen] = useState(questions);
  if (seen !== questions) {
    setSeen(questions);
    const parsed = parseQuestions(raw);
    const current = questions.map((q) => q.prompt);
    const same =
      parsed.length === current.length &&
      parsed.every((p, i) => p === current[i]);
    if (!same) setRaw(current.join("\n"));
  }

  function handleChange(value: string) {
    setRaw(value);
    const prompts = parseQuestions(value);
    onChange(
      prompts.map((prompt, i) => ({
        ...questions[i],
        id: questions[i]?.id ?? createId("q"),
        prompt,
      }))
    );
  }

  const count = parseQuestions(raw).length;

  return (
    <Stack gap="xs">
      <Textarea
        placeholder={
          "Type your questions — start a new one whenever, e.g.\nWhat are you trying to accomplish? Who is the audience?\nWhat tone should I use?"
        }
        value={raw}
        onChange={(e) => handleChange(e.currentTarget.value)}
        autosize
        minRows={4}
        maxRows={12}
      />
      <Text size="xs" c="dimmed">
        {count === 0
          ? "Each question (ending with “?” or on its own line) is asked when a chat starts; the AI turns each into a multiple-choice question."
          : `Detected ${count} question${count > 1 ? "s" : ""}. The AI turns each into a multiple-choice question when a chat starts.`}
      </Text>
    </Stack>
  );
}
