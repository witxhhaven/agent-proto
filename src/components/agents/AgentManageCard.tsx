"use client";

import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Menu,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import {
  IconDots,
  IconPencil,
  IconFlask,
  IconMessage,
  IconClock,
  IconTrash,
} from "@tabler/icons-react";
import type { Agent } from "@/types";
import { actions } from "@/lib/store";
import { AgentAvatar } from "@/components/common/AgentAvatar";

/**
 * "Created by You" agent card. Mirrors the marketplace AssistantCard shell
 * (avatar top-left, classification badge top-right, name + description) but the
 * footer carries the enabled Switch (left) and a 3-dots actions Menu (right).
 */
export function AgentManageCard({
  agent,
  scheduleCount,
  onDelete,
}: {
  agent: Agent;
  scheduleCount: number;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  function chat() {
    const c = actions.createChat({
      agentId: agent.id,
      title: "Untitled",
      assistantName: agent.name,
    });
    router.push(`/chat/${c.id}`);
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm" h="100%">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <AgentAvatar
            iconName={agent.iconName}
            bgColor={agent.bgColor}
            imageUrl={agent.imageUrl}
            size={40}
          />
          <Badge variant="light" color="brand-blue" size="sm" radius="sm">
            CCE/SN
          </Badge>
        </Group>

        <Stack gap={4} style={{ flex: 1, cursor: "pointer" }} onClick={chat}>
          <Text fw={600} lineClamp={1}>
            {agent.name}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={2}>
            {agent.description}
          </Text>
          <Group gap="xs" mt={2}>
            <Badge variant="light" color="gray" size="xs">
              {agent.toolIds.length} tools
            </Badge>
            {scheduleCount > 0 && (
              <Badge variant="light" color="gray" size="xs">
                Used in {scheduleCount} schedule{scheduleCount > 1 ? "s" : ""}
              </Badge>
            )}
          </Group>
        </Stack>

        <Group justify="space-between" align="center" wrap="nowrap">
          <Switch
            checked={agent.enabled}
            onChange={() => actions.toggleAgentEnabled(agent.id)}
            aria-label="Toggle enabled"
            label={agent.enabled ? "On" : "Off"}
          />
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Agent actions"
              >
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconPencil size={16} />}
                onClick={() => router.push(`/agents/${agent.id}`)}
              >
                Edit
              </Menu.Item>
              <Menu.Item
                leftSection={<IconFlask size={16} />}
                onClick={() => router.push(`/agents/${agent.id}?tab=test`)}
              >
                Test
              </Menu.Item>
              <Menu.Item leftSection={<IconMessage size={16} />} onClick={chat}>
                Chat
              </Menu.Item>
              <Menu.Item
                leftSection={<IconClock size={16} />}
                onClick={() => router.push(`/scheduled?agentId=${agent.id}`)}
              >
                Schedule this agent
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => onDelete(agent.id)}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Stack>
    </Card>
  );
}
