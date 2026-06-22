"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Tabs,
  Text,
  Textarea,
} from "@mantine/core";
import {
  IconSparkles,
  IconBolt,
  IconPlayerPlay,
  IconPencilPlus,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import type { ScheduledTask } from "@/types";
import { actions, getState, SCHEDULE_CAP, useStore } from "@/lib/store";
import { extractSchedule } from "@/lib/structured";
import { plainTextToInstruction, instructionToPlainText } from "@/lib/instructions";
import { EmptyState } from "@/components/common/EmptyState";
import { TypingDots } from "@/components/common/TypingDots";
import tabClasses from "@/app/agents/segmented-tabs.module.css";
import { ScheduleRunRow } from "./ScheduleRunRow";
import {
  ScheduleForm,
  emptyScheduleDraft,
  type ScheduleDraft,
} from "./ScheduleForm";

/** Build an editable draft from an existing scheduled task. */
function draftFromTask(task: ScheduledTask): ScheduleDraft {
  return {
    title: task.title,
    agentId: task.agentId,
    instructions: task.instructions,
    knowledgeFileRef: task.knowledgeFileRef ?? null,
    timing: task.timing,
  };
}

export function ScheduleCreate({
  opened,
  onClose,
  defaultAgentId,
  task,
  initialTab = "settings",
}: {
  opened: boolean;
  onClose: () => void;
  defaultAgentId?: string | null;
  /** When provided, the modal edits this task (prefilled) instead of creating. */
  task?: ScheduledTask;
  /** Which tab to open on (edit modal only). */
  initialTab?: "settings" | "log";
}) {
  const isEdit = !!task;
  const makeInitial = (): ScheduleDraft => {
    if (task) return draftFromTask(task);
    const base = emptyScheduleDraft();
    if (defaultAgentId) {
      base.agentId = defaultAgentId;
    }
    return base;
  };
  const [draft, setDraft] = useState<ScheduleDraft>(makeInitial);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>(initialTab);
  const [autoOffOpen, setAutoOffOpen] = useState(false);
  // Schedules currently switched on across the store — used to enforce the cap.
  const activeCount = useStore(
    (s) => s.scheduledTasks.filter((t) => t.enabled).length
  );
  // Create flow has two steps (like agent creation): pick how to start, then the
  // form. Editing skips straight to the form.
  const [step, setStep] = useState<"choose" | "form">(
    isEdit ? "form" : "choose"
  );

  // Match the Log tab's min-height to the (taller, dynamic) Settings tab so
  // switching tabs doesn't shrink/re-center the modal. Measured live because the
  // instructions field autosizes.
  const settingsRef = useRef<HTMLDivElement>(null);
  const [settingsHeight, setSettingsHeight] = useState<number | undefined>(
    undefined
  );
  useEffect(() => {
    const el = settingsRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      // offsetHeight is 0 while the panel is hidden — ignore those readings.
      if (el.offsetHeight > 0) setSettingsHeight(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isEdit, opened]);

  // Live task (run history updates as you "Run now") read from the store by id.
  const liveTask = useStore((s) =>
    task ? s.scheduledTasks.find((t) => t.id === task.id) : undefined
  );
  const runHistory = liveTask?.runHistory ?? [];

  // Re-prefill from the task each time an edit modal is (re)opened. Done at
  // render time (on the open transition) rather than in an effect.
  const [wasOpen, setWasOpen] = useState(false);
  if (opened !== wasOpen) {
    setWasOpen(opened);
    if (opened) {
      setTab(initialTab);
      setStep(task ? "form" : "choose");
      if (task) {
        setDraft(draftFromTask(task));
        setTestResponse(null);
      } else {
        setDraft(makeInitial());
        setAiPrompt("");
      }
    }
  }

  async function runAi() {
    const text = aiPrompt.trim();
    if (!text) return;
    setAiLoading(true);
    try {
      const agents = getState().agents.map((a) => ({ id: a.id, name: a.name }));
      const extracted = await extractSchedule(text, agents);
      setDraft((d) => ({
        ...d,
        title: extracted.title || d.title,
        agentId: extracted.agentId ?? d.agentId,
        instructions: plainTextToInstruction(
          extracted.instructionsText,
          getState().agents
        ),
        timing: extracted.timing,
      }));
      notifications.show({
        title: extracted.isSchedule ? "Draft ready" : "Filled from text",
        message: "Review the schedule below, then save.",
        color: "brand-blue",
      });
      setStep("form");
    } finally {
      setAiLoading(false);
    }
  }

  // Ephemeral — NOT written to runHistory.
  function testNow() {
    const desc =
      instructionToPlainText(draft.instructions) ||
      (draft.agentId
        ? `agent "${getState().agents.find((a) => a.id === draft.agentId)?.name ?? "—"}"`
        : "this task");
    setTestResponse(
      `Sample output for ${desc}: here's what a run would produce. (mock response — not saved)`
    );
  }

  async function save() {
    if (saving) return;
    if (!draft.title.trim()) {
      notifications.show({
        title: "Title required",
        message: "Give your schedule a title before saving.",
        color: "red",
      });
      return;
    }
    const fields = {
      title: draft.title.trim(),
      instructions: draft.instructions,
      agentId: draft.agentId,
      knowledgeFileRef: draft.knowledgeFileRef,
      timing: draft.timing,
    };
    // Show the three-dot indicator while the schedule is being "created"
    // (mock work — no backend), matching the chat/AI-assist loading style.
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (isEdit && task) {
        actions.updateScheduledTask(task.id, fields);
        notifications.show({
          title: "Schedule updated",
          message: `${fields.title} has been updated.`,
          color: "brand-blue",
        });
      } else {
        // Active-schedule cap: if all slots are full, create it switched OFF and
        // explain via a modal instead of silently overflowing the quota.
        const full = activeCount >= SCHEDULE_CAP;
        actions.createScheduledTask({
          ...fields,
          enabled: !full,
          origin: "schedule-page",
        });
        if (full) {
          setAutoOffOpen(true);
          return; // keep the modal mounted; the cap modal handles closing
        }
        notifications.show({
          title: "Schedule created",
          message: `${fields.title} is now scheduled.`,
          color: "brand-blue",
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // Step 1 (create only): describe-to-draft, or start from scratch — mirrors the
  // agent creation chooser.
  const chooserBody = (
    <Stack gap="md">
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <Textarea
          placeholder="e.g. Send me a news digest every weekday at 8am"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.currentTarget.value)}
          autosize
          minRows={2}
          style={{ flex: 1 }}
        />
        <Button
          leftSection={aiLoading ? undefined : <IconSparkles size={16} />}
          onClick={runAi}
          disabled={aiLoading || !aiPrompt.trim()}
        >
          {aiLoading ? <TypingDots /> : "Draft"}
        </Button>
      </Group>

      <Divider label="or" labelPosition="center" />

      <Group justify="center">
        <Button
          variant="default"
          leftSection={<IconPencilPlus size={16} />}
          onClick={() => setStep("form")}
        >
          Create from scratch
        </Button>
      </Group>
    </Stack>
  );

  const settingsBody = (
    <Stack gap="md">
      <ScheduleForm value={draft} onChange={setDraft} />

      {testResponse && (
        <Alert color="brand-blue" variant="light" title="Test response (not saved)">
          {testResponse}
        </Alert>
      )}

      <Group justify="space-between">
        <Button
          variant="default"
          leftSection={<IconBolt size={16} />}
          onClick={testNow}
        >
          Test response now
        </Button>
        <Group gap="xs">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <TypingDots /> : "Save"}
          </Button>
        </Group>
      </Group>
    </Stack>
  );

  const logBody = (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button
          variant="light"
          leftSection={<IconPlayerPlay size={16} />}
          onClick={() => task && actions.runScheduledTaskNow(task.id)}
        >
          Run now
        </Button>
      </Group>
      {runHistory.length === 0 ? (
        <EmptyState
          title="No runs yet"
          description="Use 'Run now' to simulate a run and see the log grow."
        />
      ) : (
        <Stack gap="xs">
          {runHistory.map((run) => (
            <ScheduleRunRow key={run.id} run={run} />
          ))}
        </Stack>
      )}
    </Stack>
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        isEdit
          ? "Edit schedule"
          : step === "choose"
            ? "What do you want to schedule?"
            : "New schedule"
      }
      size="xl"
      centered
      styles={{ title: { fontSize: "1.25rem", fontWeight: 700 } }}
    >
      {!isEdit && step === "choose" ? (
        chooserBody
      ) : isEdit ? (
        <Tabs value={tab} onChange={setTab} variant="pills">
          <Tabs.List className={tabClasses.list} mb="md">
            <Tabs.Tab value="settings" className={tabClasses.tab}>
              Settings
            </Tabs.Tab>
            <Tabs.Tab value="log" className={tabClasses.tab}>
              Log ({runHistory.length})
            </Tabs.Tab>
          </Tabs.List>
          {/* Log tab matches the measured Settings height so switching tabs
              doesn't shrink (and re-center) the modal. */}
          <Tabs.Panel value="settings">
            <div ref={settingsRef}>{settingsBody}</div>
          </Tabs.Panel>
          <Tabs.Panel value="log" style={{ minHeight: settingsHeight }}>
            {logBody}
          </Tabs.Panel>
        </Tabs>
      ) : (
        settingsBody
      )}

      <Modal
        opened={autoOffOpen}
        onClose={() => {
          setAutoOffOpen(false);
          onClose();
        }}
        title="Maximum active schedules reached"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            You can have up to {SCHEDULE_CAP} schedules switched on at a time, and
            you&apos;ve already reached that limit. We&apos;ve saved{" "}
            <strong>{draft.title.trim() || "this schedule"}</strong> and switched
            it <strong>off</strong> for now. Turn another schedule off to free a
            slot, then switch this one on.
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => {
                setAutoOffOpen(false);
                onClose();
              }}
            >
              Got it
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
}
