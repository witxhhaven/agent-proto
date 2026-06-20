"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconChevronDown,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { actions, useStore } from "@/lib/store";
import {
  ScheduleForm,
  type ScheduleDraft,
} from "@/components/scheduled/ScheduleForm";
import { EmptyState } from "@/components/common/EmptyState";

export default function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const task = useStore((s) => s.scheduledTasks.find((t) => t.id === id));

  const [draft, setDraft] = useState<ScheduleDraft | null>(
    task
      ? {
          title: task.title,
          mode: task.agentId ? "agent" : "standalone",
          agentId: task.agentId,
          instructions: task.instructions,
          knowledgeFileRef: task.knowledgeFileRef ?? null,
          timing: task.timing,
        }
      : null
  );

  if (!task || !draft) {
    return (
      <Container size="md" py="xl">
        <EmptyState
          title="Schedule not found"
          description="This scheduled task may have been deleted."
          action={{
            label: "Back to Scheduled",
            onClick: () => router.push("/scheduled"),
          }}
        />
      </Container>
    );
  }

  function save() {
    if (!draft) return;
    if (!draft.title.trim()) {
      notifications.show({
        title: "Title required",
        message: "Give your schedule a title.",
        color: "red",
      });
      return;
    }
    actions.updateScheduledTask(id, {
      title: draft.title.trim(),
      agentId: draft.mode === "agent" ? draft.agentId : null,
      instructions: draft.instructions,
      knowledgeFileRef: draft.knowledgeFileRef,
      timing: draft.timing,
    });
    notifications.show({
      title: "Saved",
      message: "Schedule updated.",
      color: "indigo",
    });
  }

  function remove() {
    actions.deleteScheduledTask(id);
    router.push("/scheduled");
  }

  return (
    <Container size="md" py="xl">
      <Group mb="lg" gap="sm">
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => router.push("/scheduled")}
          aria-label="Back"
        >
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Text fw={600} size="lg">
          {task.title}
        </Text>
      </Group>

      <Tabs defaultValue={searchParams.get("tab") === "log" ? "log" : "settings"}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
          <Tabs.Tab value="log">Log ({task.runHistory.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="settings">
          <Stack gap="lg">
            <ScheduleForm value={draft} onChange={setDraft} />
            <Group justify="space-between">
              <Button variant="subtle" color="red" onClick={remove}>
                Delete
              </Button>
              <Button onClick={save}>Save</Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="log">
          <Group justify="flex-end" mb="md">
            <Button
              variant="light"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => actions.runScheduledTaskNow(id)}
            >
              Run now
            </Button>
          </Group>
          {task.runHistory.length === 0 ? (
            <EmptyState
              title="No runs yet"
              description="Use 'Run now' to simulate a run and see the log grow."
            />
          ) : (
            <Stack gap="xs">
              {task.runHistory.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

function RunRow({
  run,
}: {
  run: import("@/types").ScheduledRunLog;
}) {
  const [open, setOpen] = useState(false);
  const color =
    run.status === "success" ? "green" : run.status === "failed" ? "red" : "blue";
  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Badge variant="light" color={color} size="sm">
            {run.status}
          </Badge>
          <Text size="sm">{new Date(run.ranAt).toLocaleString()}</Text>
          <Text size="xs" c="dimmed">
            {run.source}
            {run.durationMs ? ` · ${(run.durationMs / 1000).toFixed(1)}s` : ""}
          </Text>
        </Group>
        {run.response && (
          <Button
            variant="subtle"
            size="xs"
            rightSection={<IconChevronDown size={14} />}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide" : "View"} response
          </Button>
        )}
      </Group>
      {run.response && open && (
        <Text size="sm" mt="xs" c="dimmed">
          {run.response}
        </Text>
      )}
    </Paper>
  );
}
