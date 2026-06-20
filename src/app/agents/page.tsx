"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Menu,
  Modal,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconDots,
  IconPencil,
  IconFlask,
  IconMessage,
  IconClock,
  IconTrash,
} from "@tabler/icons-react";
import type { Agent } from "@/types";
import { actions, useStore } from "@/lib/store";
import { AgentAvatar } from "@/components/common/AgentAvatar";
import { AssistantCard } from "@/components/explore/AssistantCard";
import { EmptyState } from "@/components/common/EmptyState";

const AGENT_CAP = 5;

export default function AgentsPage() {
  const router = useRouter();
  const agents = useStore((s) => s.agents);
  const assistants = useStore((s) => s.assistants);
  const scheduledTasks = useStore((s) => s.scheduledTasks);
  const savedAssistants = assistants.filter((a) => a.saved);

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const atCap = agents.length >= AGENT_CAP;
  const target = agents.find((a) => a.id === confirmId) ?? null;

  function askDelete(id: string) {
    setConfirmId(id);
    open();
  }
  function doDelete() {
    if (confirmId) actions.deleteAgent(confirmId);
    close();
    setConfirmId(null);
  }

  function chatWith(agent: Agent) {
    const chat = actions.createChat({
      agentId: agent.id,
      title: `Chat with ${agent.name}`,
      assistantName: agent.name,
    });
    router.push(`/chat/${chat.id}`);
  }

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" align="center" mb="lg" wrap="nowrap">
        <Title order={2}>My Agents</Title>
        <Group gap="sm">
          <Badge
            variant="light"
            color={atCap ? "orange" : "gray"}
            size="lg"
            radius="sm"
          >
            {agents.length}/{AGENT_CAP} agents used
          </Badge>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => router.push("/agents/new")}
            disabled={atCap}
          >
            New Agent
          </Button>
        </Group>
      </Group>

      <Tabs defaultValue="created">
        <Tabs.List mb="lg">
          <Tabs.Tab value="created">Created by You</Tabs.Tab>
          <Tabs.Tab value="saved">
            Saved Agents ({savedAssistants.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="created">
          {agents.length === 0 ? (
            <EmptyState
              title="No agents found"
              description="Create an agent from a template to automate a repeatable task."
              action={{
                label: "+ New Agent",
                onClick: () => router.push("/agents/new"),
              }}
            />
          ) : (
            <Stack gap="sm">
              {agents.map((agent) => {
                const scheduleCount = scheduledTasks.filter(
                  (t) => t.agentId === agent.id
                ).length;
                return (
                  <Card key={agent.id} withBorder radius="md" padding="md">
                    <Group justify="space-between" wrap="nowrap">
                      <Group
                        wrap="nowrap"
                        gap="md"
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <AgentAvatar
                          iconName={agent.iconName}
                          bgColor={agent.bgColor}
                          imageUrl={agent.imageUrl}
                          size={44}
                        />
                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} lineClamp={1}>
                            {agent.name}
                          </Text>
                          <Text size="sm" c="dimmed" lineClamp={1}>
                            {agent.description}
                          </Text>
                          <Group gap="xs" mt={2}>
                            <Badge variant="light" color="gray" size="xs">
                              {agent.toolIds.length} tools
                            </Badge>
                            {scheduleCount > 0 && (
                              <Badge variant="light" color="gray" size="xs">
                                Used in {scheduleCount} schedule
                                {scheduleCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                      </Group>

                      <Group gap="sm" wrap="nowrap">
                        <Switch
                          checked={agent.enabled}
                          onChange={() => actions.toggleAgentEnabled(agent.id)}
                          aria-label="Toggle enabled"
                        />
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <Button
                              variant="subtle"
                              color="gray"
                              px={6}
                              aria-label="Agent actions"
                            >
                              <IconDots size={18} />
                            </Button>
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
                              onClick={() =>
                                router.push(`/agents/${agent.id}?tab=test`)
                              }
                            >
                              Test
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconMessage size={16} />}
                              onClick={() => chatWith(agent)}
                            >
                              Chat
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconClock size={16} />}
                              onClick={() =>
                                router.push(`/scheduled?agentId=${agent.id}`)
                              }
                            >
                              Schedule this agent
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={16} />}
                              onClick={() => askDelete(agent.id)}
                            >
                              Delete
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="saved">
          <Text c="dimmed" mb="md">
            Agents you save here can be used by your Personal AI Assistant.
          </Text>
          {savedAssistants.length === 0 ? (
            <EmptyState
              title="No saved agents yet"
              description="Browse the Agent Marketplace and save agents you want to reuse."
              action={{
                label: "Open Agent Marketplace",
                onClick: () => router.push("/explore"),
              }}
            />
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {savedAssistants.map((a) => (
                <AssistantCard key={a.id} assistant={a} />
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>

      <Modal opened={opened} onClose={close} title="Delete agent" centered>
        <Text size="sm" mb="lg">
          Delete <strong>{target?.name}</strong>? This also removes it from the
          Agent Marketplace. This can&apos;t be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button color="red" onClick={doDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
