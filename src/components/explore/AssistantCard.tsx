"use client";

import { useRouter } from "next/navigation";
import { ActionIcon, Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import type { Assistant } from "@/types";
import { actions } from "@/lib/store";
import { AgentAvatar } from "@/components/common/AgentAvatar";

export function AssistantCard({ assistant }: { assistant: Assistant }) {
  const router = useRouter();

  function startChat() {
    const chat = actions.createChat({
      agentId: assistant.isOwned ? assistant.id : null,
      title: `Chat with ${assistant.name}`,
      assistantName: assistant.name,
    });
    router.push(`/chat/${chat.id}`);
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm" h="100%">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <AgentAvatar
            iconName={assistant.iconName}
            bgColor={assistant.bgColor}
            size={40}
          />
          <Group gap={6} wrap="nowrap">
            <Badge variant="light" color="indigo" size="sm" radius="sm">
              {assistant.classification ?? "CCE/SN"}
            </Badge>
            <ActionIcon
              variant="subtle"
              color={assistant.favorited ? "red" : "gray"}
              aria-label={assistant.favorited ? "Unfavourite" : "Favourite"}
              onClick={() => actions.toggleFavorite(assistant.id)}
            >
              {assistant.favorited ? (
                <IconHeartFilled size={18} />
              ) : (
                <IconHeart size={18} />
              )}
            </ActionIcon>
          </Group>
        </Group>

        <Stack gap={4} style={{ flex: 1, cursor: "pointer" }} onClick={startChat}>
          <Text fw={600}>{assistant.name}</Text>
          <Text size="sm" c="dimmed" lineClamp={3}>
            {assistant.description}
          </Text>
        </Stack>

        {assistant.saved ? (
          <Button
            variant="default"
            color="red"
            onClick={() => actions.toggleSaved(assistant.id)}
          >
            Remove from My Agents
          </Button>
        ) : (
          <Button
            variant="light"
            onClick={() => actions.toggleSaved(assistant.id)}
          >
            Save to My Agents
          </Button>
        )}
      </Stack>
    </Card>
  );
}
