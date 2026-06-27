"use client";

import { useState } from "react";
import {
  ActionIcon,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Button,
} from "@mantine/core";
import { IconArrowUp, IconPencilPlus } from "@tabler/icons-react";
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
      title="What agent do you want to create?"
      size="lg"
      centered
      styles={{ title: { fontSize: "1.25rem", fontWeight: 700 } }}
    >
      <Stack gap="lg">
        <Paper withBorder radius="lg" p="sm" shadow="xs">
          <Textarea
            placeholder="Describe the agent you want — what it should do, who it's for, and what it needs to know"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            variant="unstyled"
            autosize
            minRows={2}
            maxRows={8}
            px="xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                e.preventDefault();
                onDraftWithAi(text.trim());
              }
            }}
          />
          <Group justify="flex-end" mt="xs">
            <ActionIcon
              variant="filled"
              size="lg"
              radius="xl"
              aria-label="Draft with AI"
              disabled={!text.trim()}
              onClick={() => onDraftWithAi(text.trim())}
            >
              <IconArrowUp size={18} />
            </ActionIcon>
          </Group>
        </Paper>

        <Divider
          label="Or choose from our templates"
          labelPosition="left"
          styles={{ label: { fontSize: "14px" } }}
        />

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
                  <Text fw={600} size="md">
                    {t.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t.shortDescription}
                  </Text>
                </Stack>
              </Group>
            </Card>
          ))}
        </SimpleGrid>

        <Group justify="flex-start">
          <Button
            variant="default"
            leftSection={<IconPencilPlus size={16} />}
            onClick={onScratch}
          >
            Start from scratch
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
