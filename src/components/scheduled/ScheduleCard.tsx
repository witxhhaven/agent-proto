"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Card,
  Group,
  Menu,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconHistory,
  IconDots,
  IconPencil,
  IconPlayerPlay,
  IconListDetails,
  IconTrash,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { ScheduledTask } from "@/types";
import { actions, useStore } from "@/lib/store";
import { describeTiming } from "@/lib/cron";
import { instructionToPlainText } from "@/lib/instructions";
import { ScheduleCreate } from "./ScheduleCreate";

export function ScheduleCard({
  task,
  compact = false,
}: {
  task: ScheduledTask;
  compact?: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const agent = useStore((s) =>
    task.agentId ? s.agents.find((a) => a.id === task.agentId) : undefined
  );

  const description =
    task.agentId && agent
      ? agent.description
      : instructionToPlainText(task.instructions);

  function open() {
    router.push(`/scheduled/${task.id}`);
  }

  return (
    <>
    <Card withBorder radius="md" padding={compact ? "sm" : "md"}>
      <Group wrap="nowrap" align="flex-start" gap="md">
        <ThemeIcon variant="light" color="brand-blue" radius="xl" size={40}>
          <IconHistory size={20} />
        </ThemeIcon>

        <Stack gap={2} style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={open}>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed">
              {describeTiming(task.timing)}
            </Text>
            <Tooltip label="Runs on this schedule (display only)">
              <IconInfoCircle size={12} color="var(--mantine-color-dimmed)" />
            </Tooltip>
          </Group>
          <Text fw={600} lineClamp={1}>
            {task.title}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={1}>
            {description || "No description"}
          </Text>
        </Stack>

        <Group gap="xs" wrap="nowrap">
          <Switch
            checked={task.enabled}
            onChange={() => actions.toggleScheduledTaskEnabled(task.id)}
            aria-label="Toggle schedule"
          />
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label="Schedule actions">
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconPencil size={16} />}
                onClick={compact ? () => setEditOpen(true) : open}
              >
                Edit
              </Menu.Item>
              {!compact && (
                <>
                  <Menu.Item
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={() => actions.runScheduledTaskNow(task.id)}
                  >
                    Run now
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconListDetails size={16} />}
                    onClick={() => router.push(`/scheduled/${task.id}?tab=log`)}
                  >
                    View log
                  </Menu.Item>
                </>
              )}
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => actions.deleteScheduledTask(task.id)}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Card>
    {compact && (
      <ScheduleCreate
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        task={task}
      />
    )}
    </>
  );
}
