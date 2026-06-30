"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import type { IntakeQuestion, ToolStepKind } from "@/types";
import { createId } from "@/lib/id";
import {
  availableKinds,
  countPillsOfKind,
  kindLabel,
  kindMenuLabel,
  linkedToolNames,
  makeToolStepQuestion,
} from "@/lib/toolSteps";
import classes from "./QuestionsEditor.module.css";

export interface QuestionsEditorProps {
  questions: IntakeQuestion[];
  toolIds: string[];
  onChange: (questions: IntakeQuestion[]) => void;
}

export function QuestionsEditor({
  questions,
  toolIds,
  onChange,
}: QuestionsEditorProps) {
  const kinds = availableKinds(toolIds);

  const [editIndex, setEditIndex] = useState<number | null>(null);
  // Row to focus next (after add/remove/arrow-nav), with where to put the caret
  // ("start", "end", or a character offset for line merges).
  const [focus, setFocus] = useState<{
    id: string;
    caret: "start" | "end" | number;
  } | null>(null);

  function setPrompt(index: number, prompt: string) {
    onChange(questions.map((q, i) => (i === index ? { ...q, prompt } : q)));
  }

  // Enter splits the row at the caret: text before stays, text after drops to a
  // new question row (caret at its start) — like a line break in a textarea.
  function splitQuestion(index: number, before: string, after: string) {
    const cur = questions[index];
    const nq: IntakeQuestion = { id: createId("q"), prompt: after };
    onChange([
      ...questions.slice(0, index),
      { ...cur, prompt: before },
      nq,
      ...questions.slice(index + 1),
    ]);
    setFocus({ id: nq.id, caret: "start" });
  }

  function removeAt(index: number) {
    let prevText: string | null = null;
    for (let i = index - 1; i >= 0; i--) {
      if (!questions[i].toolStep) {
        prevText = questions[i].id;
        break;
      }
    }
    onChange(questions.filter((_, i) => i !== index));
    if (prevText) setFocus({ id: prevText, caret: "end" });
  }

  // Arrow up/down across text rows (skipping pills), like one continuous textarea.
  function navigate(index: number, dir: -1 | 1) {
    let j = index + dir;
    while (j >= 0 && j < questions.length && questions[j].toolStep) j += dir;
    if (j < 0 || j >= questions.length || questions[j].toolStep) return;
    setFocus({ id: questions[j].id, caret: dir === 1 ? "start" : "end" });
  }

  // Backspace at the start of a row: merge it into the previous text row (caret
  // at the join). If the row above is a pill, only delete when the row is empty.
  function backspaceAtStart(index: number) {
    const prev = index > 0 ? questions[index - 1] : null;
    if (prev && !prev.toolStep) {
      const junction = prev.prompt.length;
      const merged = prev.prompt + questions[index].prompt;
      onChange(
        questions
          .map((q, i) => (i === index - 1 ? { ...q, prompt: merged } : q))
          .filter((_, i) => i !== index)
      );
      setFocus({ id: prev.id, caret: junction });
    } else if (!questions[index].prompt) {
      removeAt(index);
    }
  }

  // Delete at the end of a row: pull the next text row up into this one.
  function deleteAtEnd(index: number) {
    const next = index < questions.length - 1 ? questions[index + 1] : null;
    if (!next || next.toolStep) return;
    const cur = questions[index];
    const junction = cur.prompt.length;
    onChange(
      questions
        .map((q, i) => (i === index ? { ...q, prompt: cur.prompt + next.prompt } : q))
        .filter((_, i) => i !== index + 1)
    );
    setFocus({ id: cur.id, caret: junction });
  }

  // Move a pill one position up/down — line-by-line, swapping with the adjacent
  // entry (a question line or another pill).
  function movePill(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  }

  function insertPill(kind: ToolStepKind) {
    onChange([...questions, makeToolStepQuestion(kind)]);
  }

  function updatePrompt(index: number, prompt: string) {
    onChange(questions.map((q, i) => (i === index ? { ...q, prompt } : q)));
  }

  function removePill(index: number) {
    onChange(questions.filter((_, i) => i !== index));
    setEditIndex(null);
  }

  // Count both typed questions and the tool-prefilled pills.
  const questionCount = questions.filter(
    (q) => q.toolStep || q.prompt.trim()
  ).length;
  const hasTextRow = questions.some((q) => !q.toolStep);
  const editing = editIndex !== null ? questions[editIndex] : null;

  return (
    <Stack gap="xs">
      <Box
        style={{
          border: "1px solid var(--mantine-color-gray-4)",
          borderRadius: 8,
          padding: 6,
        }}
      >
        <Stack gap={2}>
          {questions.map((q, i) =>
            q.toolStep ? (
              <PillRow
                key={q.id}
                q={q}
                canUp={i > 0}
                canDown={i < questions.length - 1}
                onUp={() => movePill(i, -1)}
                onDown={() => movePill(i, 1)}
                onOpen={() => setEditIndex(i)}
                canDelete={
                  !!q.toolStep && countPillsOfKind(questions, q.toolStep) > 1
                }
                onDelete={() => removePill(i)}
              />
            ) : (
              <TextRow
                key={q.id}
                q={q}
                focusCaret={focus?.id === q.id ? focus.caret : null}
                onFocused={() => setFocus(null)}
                placeholder="Type a question…"
                onPrompt={(v) => setPrompt(i, v)}
                onEnter={(before, after) => splitQuestion(i, before, after)}
                onBackspaceStart={() => backspaceAtStart(i)}
                onDeleteEnd={() => deleteAtEnd(i)}
                onNavigate={(dir) => navigate(i, dir)}
              />
            )
          )}

          {/* When there are no text rows (e.g. only pills), keep one line to
              type into — Enter then continues from there. */}
          {!hasTextRow && (
            <Textarea
              value=""
              placeholder="Type a question…"
              onChange={(e) => {
                const id = createId("q");
                onChange([...questions, { id, prompt: e.currentTarget.value }]);
                setFocus({ id, caret: "end" });
              }}
              variant="unstyled"
              autosize
              minRows={1}
              px={4}
            />
          )}
        </Stack>
      </Box>

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {questionCount === 0
            ? "Each question is asked when a chat starts; the AI turns each into a multiple-choice question."
            : `Detected ${questionCount} question${questionCount > 1 ? "s" : ""}.`}
          {questions.some((q) => q.toolStep) &&
            " Use ↑↓ on a pill to move it; click it to refine."}
        </Text>
        {kinds.length > 0 && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />}>
                Insert question
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Ask the user for…</Menu.Label>
              {kinds.map((k) => (
                <Menu.Item key={k} onClick={() => insertPill(k)}>
                  {kindMenuLabel(k)}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <Modal
        opened={editIndex !== null}
        onClose={() => setEditIndex(null)}
        title="Refine question"
        centered
      >
        {editing && editing.toolStep && (
          <Stack gap="md">
            <Badge size="sm" variant="light" color="gray" radius="sm" w="fit-content">
              {kindLabel(editing.toolStep)}
            </Badge>
            <Textarea
              label="Question"
              value={editing.prompt}
              onChange={(e) =>
                editIndex !== null && updatePrompt(editIndex, e.currentTarget.value)
              }
              autosize
              minRows={2}
              maxRows={6}
            />
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Linked tools
              </Text>
              <Group gap={6}>
                {linkedToolNames(editing.toolStep, toolIds).map((name) => (
                  <Badge key={name} variant="light" color="brand-blue" radius="sm">
                    {name}
                  </Badge>
                ))}
              </Group>
              <Text size="xs" c="dimmed">
                Managed by the agent&apos;s tools.
              </Text>
            </Stack>
            <Group justify="space-between">
              <Button
                variant="subtle"
                color="red"
                size="xs"
                disabled={
                  editIndex === null ||
                  countPillsOfKind(questions, editing.toolStep) <= 1
                }
                onClick={() => editIndex !== null && removePill(editIndex)}
              >
                Remove
              </Button>
              <Button size="xs" onClick={() => setEditIndex(null)}>
                Done
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function PillRow({
  q,
  canUp,
  canDown,
  onUp,
  onDown,
  onOpen,
  canDelete,
  onDelete,
}: {
  q: IntakeQuestion;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onOpen: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <div className={classes.pill} onClick={onOpen}>
      <Group gap={0} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          disabled={!canUp}
          aria-label="Move up"
          onClick={onUp}
        >
          <IconChevronUp size={14} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          disabled={!canDown}
          aria-label="Move down"
          onClick={onDown}
        >
          <IconChevronDown size={14} />
        </ActionIcon>
      </Group>
      <Text
        size="sm"
        fw={500}
        c="brand-blue.8"
        style={{ flex: 1, overflowWrap: "anywhere" }}
      >
        {q.prompt.trim() || "Question"}
      </Text>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        disabled={!canDelete}
        aria-label="Delete question"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <IconX size={14} />
      </ActionIcon>
    </div>
  );
}

function TextRow({
  q,
  focusCaret,
  onFocused,
  placeholder,
  onPrompt,
  onEnter,
  onBackspaceStart,
  onDeleteEnd,
  onNavigate,
}: {
  q: IntakeQuestion;
  focusCaret: "start" | "end" | number | null;
  onFocused: () => void;
  placeholder?: string;
  onPrompt: (value: string) => void;
  onEnter: (before: string, after: string) => void;
  onBackspaceStart: () => void;
  onDeleteEnd: () => void;
  onNavigate: (dir: -1 | 1) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusCaret === null) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    const pos =
      focusCaret === "end"
        ? len
        : focusCaret === "start"
          ? 0
          : Math.min(focusCaret, len);
    el.setSelectionRange(pos, pos);
    onFocused();
  }, [focusCaret, onFocused]);

  return (
    <Textarea
      ref={ref}
      value={q.prompt}
      placeholder={placeholder}
      onChange={(e) => onPrompt(e.currentTarget.value)}
      onKeyDown={(e) => {
        const el = e.currentTarget;
        const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
        const atEnd =
          el.selectionStart === el.value.length &&
          el.selectionEnd === el.value.length;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter(
            el.value.slice(0, el.selectionStart),
            el.value.slice(el.selectionEnd)
          );
        } else if (e.key === "Backspace" && atStart) {
          e.preventDefault();
          onBackspaceStart();
        } else if (e.key === "Delete" && atEnd) {
          e.preventDefault();
          onDeleteEnd();
        } else if (e.key === "ArrowUp") {
          // On the first visual line → move to the previous text row.
          if (!el.value.slice(0, el.selectionStart).includes("\n")) {
            e.preventDefault();
            onNavigate(-1);
          }
        } else if (e.key === "ArrowDown") {
          // On the last visual line → move to the next text row.
          if (!el.value.slice(el.selectionEnd).includes("\n")) {
            e.preventDefault();
            onNavigate(1);
          }
        }
      }}
      variant="unstyled"
      autosize
      minRows={1}
      px={4}
    />
  );
}
