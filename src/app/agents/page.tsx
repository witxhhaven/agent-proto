"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Container,
  Group,
  Modal,
  SimpleGrid,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { actions, useStore } from "@/lib/store";
import { AgentManageCard } from "@/components/agents/AgentManageCard";
import { AssistantCard } from "@/components/explore/AssistantCard";
import { EmptyState } from "@/components/common/EmptyState";

const AGENT_CAP = 5;

export default function AgentsPage() {
  const router = useRouter();
  const agents = useStore((s) => s.agents);
  const assistants = useStore((s) => s.assistants);
  const scheduledTasks = useStore((s) => s.scheduledTasks);
  const savedAssistants = assistants.filter((a) => a.saved);

  const [tab, setTab] = useState<string | null>("created");
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

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">
        My Agents
      </Title>

      <Tabs value={tab} onChange={setTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="created">Created by You</Tabs.Tab>
          <Tabs.Tab value="saved">
            Saved Agents ({savedAssistants.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Quota + New Agent live below the tabs and only on Created by You. */}
        {tab === "created" && (
          <Group justify="space-between" align="center" mb="lg" wrap="nowrap">
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
        )}

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
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {agents.map((agent) => (
                <AgentManageCard
                  key={agent.id}
                  agent={agent}
                  scheduleCount={
                    scheduledTasks.filter((t) => t.agentId === agent.id).length
                  }
                  onDelete={askDelete}
                />
              ))}
            </SimpleGrid>
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
