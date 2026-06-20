"use client";

import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconHeart,
  IconHeartFilled,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { Assistant } from "@/types";
import { actions } from "@/lib/store";
import { AgentAvatar } from "@/components/common/AgentAvatar";

const SAVE_TOOLTIP =
  "Saved agents are available to your Personal AI Assistant to use in chats and tasks.";

export function AssistantCard({ assistant }: { assistant: Assistant }) {
  const router = useRouter();

  function startChat() {
    const chat = actions.createChat({
      agentId: assistant.isOwned ? assistant.id : null,
      title: "Untitled",
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
            imageUrl={assistant.imageUrl}
            size={40}
          />
          <Group gap={6} wrap="nowrap">
            <Badge variant="light" color="brand-blue" size="sm" radius="sm">
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
            variant="outline"
            color="red"
            size="sm"
            radius="md"
            w="fit-content"
            onClick={() => actions.toggleSaved(assistant.id)}
          >
            Remove from My Agents
          </Button>
        ) : (
          <Group gap={6} wrap="nowrap">
            <Button
              variant="outline"
              color="ink"
              size="sm"
              radius="md"
              w="fit-content"
              onClick={() => actions.toggleSaved(assistant.id)}
            >
              Save to My Agents
            </Button>
            <Tooltip label={SAVE_TOOLTIP} multiline w={240} withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="About saving agents"
              >
                <IconInfoCircle size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
