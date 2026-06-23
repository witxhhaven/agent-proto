"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Container,
  Group,
  List,
  Modal,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconUserCircle,
  IconBookmark,
  IconInfoCircle,
} from "@tabler/icons-react";
import { actions, AGENT_CAP, useStore } from "@/lib/store";
import tabClasses from "./segmented-tabs.module.css";
import { AgentCard } from "@/components/common/AgentCard";
import { EmptyState } from "@/components/common/EmptyState";

export default function AgentsPage() {
  const router = useRouter();
  const agents = useStore((s) => s.agents);
  const assistants = useStore((s) => s.assistants);
  const savedAssistants = assistants.filter((a) => a.saved);

  const [tab, setTab] = useState<string | null>("created");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  // Shared quota across both tabs: agents you've ADDED (saved from the
  // marketplace) + agents you've switched ON (active created agents).
  const usedCount =
    agents.filter((a) => a.enabled).length + savedAssistants.length;
  const atCap = usedCount >= AGENT_CAP;
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

  return (
    <Container size="xl" py="xl">
      {/* Shared quota tag sits beside the title; counts added (saved) + active. */}
      <Group gap="sm" align="center" mb="lg" wrap="nowrap">
        <Title order={2}>My Agents</Title>
        <Tooltip
          label={
            <Stack gap={6}>
              <Text size="sm" fw={600}>
                Shared My Agents quota ({AGENT_CAP} max)
              </Text>
              <List size="sm" spacing={2} withPadding>
                <List.Item>Agents you&apos;ve added (saved)</List.Item>
                <List.Item>Agents you&apos;ve switched on</List.Item>
              </List>
              <Text size="sm" c="dimmed">
                At the cap? Switch one off or remove a saved agent to free a
                slot.
              </Text>
            </Stack>
          }
          multiline
          w={250}
          withArrow
        >
          <Badge
            variant="light"
            color={atCap ? "orange" : "gray"}
            size="xl"
            radius="sm"
            style={{ cursor: "default" }}
            rightSection={<IconInfoCircle size={14} />}
          >
            {usedCount} of {AGENT_CAP} active
          </Badge>
        </Tooltip>
      </Group>

      <Tabs value={tab} onChange={setTab} variant="pills">
        <Group justify="space-between" align="center" mb="xl" wrap="nowrap">
          <Tabs.List className={tabClasses.list}>
            <Tabs.Tab
              value="created"
              className={tabClasses.tab}
              leftSection={<IconUserCircle size={17} stroke={1.8} />}
            >
              Created by You
            </Tabs.Tab>
            <Tabs.Tab
              value="saved"
              className={tabClasses.tab}
              leftSection={<IconBookmark size={17} stroke={1.8} />}
            >
              Saved Agents ({savedAssistants.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* New Agent only on Created by You. */}
          {tab === "created" && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push("/agents/new")}
              disabled={atCap}
            >
              New Agent
            </Button>
          )}
        </Group>

        <Tabs.Panel value="created">
          <Text c="dimmed" mb="md">
            Switched-on agents are used by Desk in chats and tasks. Toggle an
            agent off to pause it and free up a slot.
          </Text>
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
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  variant="manage"
                  agent={agent}
                  onDelete={askDelete}
                />
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="saved">
          <Text c="dimmed" mb="md">
            Agents you save here can be used by Desk.
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
                <AgentCard key={a.id} variant="marketplace" assistant={a} />
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
