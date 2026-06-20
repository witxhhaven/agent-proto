"use client";

import { useState } from "react";
import {
  ActionIcon,
  Card,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Button,
} from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import type { AgentTemplate } from "@/types";
import { agentTemplates } from "@/data/mockAgents";
import { AgentAvatar } from "@/components/common/AgentAvatar";

export interface AgentTemplatesModalProps {
  opened: boolean;
  onClose: () => void;
  onPickTemplate: (template: AgentTemplate) => void;
  onDraftWithAi: (description: string) => void;
  onScratch: () => void;
}

export function AgentTemplatesModal({
  opened,
  onClose,
  onPickTemplate,
  onDraftWithAi,
  onScratch,
}: AgentTemplatesModalProps) {
  const [text, setText] = useState("");
  const templates = agentTemplates.filter((t) => t.id !== "scratch");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="What would you like to automate?"
      size="lg"
      centered
    >
      <Stack gap="lg">
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <Textarea
            placeholder="Build an agent or perform a task"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            autosize
            minRows={2}
            style={{ flex: 1 }}
          />
          <ActionIcon
            size="lg"
            radius="xl"
            aria-label="Draft with AI"
            disabled={!text.trim()}
            onClick={() => onDraftWithAi(text.trim())}
          >
            <IconArrowUp size={18} />
          </ActionIcon>
        </Group>

        <Divider label="Or choose from our templates" labelPosition="left" />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {templates.map((t) => (
            <Card
              key={t.id}
              withBorder
              radius="md"
              padding="md"
              style={{ cursor: "pointer" }}
              onClick={() => onPickTemplate(t)}
            >
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <AgentAvatar iconName={t.iconName} bgColor={t.bgColor} size={36} />
                <Stack gap={2}>
                  <Text fw={600} size="sm">
                    {t.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t.shortDescription}
                  </Text>
                </Stack>
              </Group>
            </Card>
          ))}
        </SimpleGrid>

        <Group justify="center">
          <Button variant="subtle" onClick={onScratch}>
            Start from scratch
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
