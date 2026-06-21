"use client";

import { useState } from "react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"settings" | "log">("settings");
  // A schedule may wrap an owned agent OR a marketplace assistant (the latter
  // isn't in state.agents), so resolve from both.
  const agent = useStore((s) =>
    task.agentId
      ? s.agents.find((a) => a.id === task.agentId) ??
        s.assistants.find((a) => a.id === task.agentId)
      : undefined
  );

  const description =
    task.agentId && agent
      ? agent.description
      : instructionToPlainText(task.instructions);

  function open(tab: "settings" | "log" = "settings") {
    setModalTab(tab);
    setModalOpen(true);
  }

  return (
    <>
      <Card withBorder radius="md" padding={compact ? "sm" : "md"}>
        <Group wrap="nowrap" align="flex-start" gap="md">
          <ThemeIcon variant="light" color="brand-blue" radius="xl" size={40}>
            <IconHistory size={20} />
          </ThemeIcon>

          <Stack
            gap={2}
            style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            onClick={() => open("settings")}
          >
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
                  onClick={() => open("settings")}
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
                      onClick={() => open("log")}
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

      <ScheduleCreate
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        task={task}
        initialTab={modalTab}
      />
    </>
  );
}
