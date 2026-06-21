"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconHeart,
  IconHeartFilled,
  IconInfoCircle,
  IconDots,
  IconPencil,
  IconFlask,
  IconMessage,
  IconClock,
  IconTrash,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import type { Agent, Assistant } from "@/types";
import { actions, useStore } from "@/lib/store";
import { AgentAvatar } from "@/components/common/AgentAvatar";

const SAVE_TOOLTIP =
  "Saved agents are available to Desk to use in chats and tasks.";

/**
 * Unified agent/assistant card. A single shell (avatar top-left, classification
 * badge top-right, name + description) with the footer + top-right actions
 * swapped by `variant`:
 *  - "marketplace": favourite heart + Save/Remove buttons (marketplace + Saved tab)
 *  - "manage": enabled Switch + 3-dots actions menu (Created by You tab)
 */
type AgentCardProps =
  | { variant: "marketplace"; assistant: Assistant }
  | { variant: "manage"; agent: Agent; onDelete: (id: string) => void };

export function AgentCard(props: AgentCardProps) {
  const router = useRouter();
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Shared shell fields, derived from whichever entity the variant carries.
  const entity = props.variant === "marketplace" ? props.assistant : props.agent;
  const classification =
    props.variant === "marketplace"
      ? props.assistant.classification ?? "CCE/SN"
      : "CCE/SN";

  // Created agents are mirrored as an owned Assistant sharing the same id; the
  // favourite flag lives there, so the manage heart reads/toggles via that id.
  const ownedFavorited = useStore((s) =>
    props.variant === "manage"
      ? s.assistants.find((a) => a.id === props.agent.id)?.favorited ?? false
      : false
  );

  const favorited =
    props.variant === "marketplace"
      ? props.assistant.favorited
      : ownedFavorited;
  const favoriteId =
    props.variant === "marketplace" ? props.assistant.id : props.agent.id;

  // Agents you created get a special gradient border in the marketplace.
  const isOwnedAgent =
    props.variant === "marketplace" && !!props.assistant.isOwned;
  // The same gradient border marks your own agents on the My Agents page too.
  const gradientBorder = isOwnedAgent || props.variant === "manage";

  function startChat() {
    if (props.variant === "marketplace") {
      const a = props.assistant;
      const chat = actions.createChat({
        // Always reference the assistant id: owned ones resolve to a real Agent,
        // marketplace ones drive intake via agentFromAssistant() in ChatView.
        agentId: a.id,
        title: "Untitled",
        assistantName: a.name,
      });
      router.push(`/chat/${chat.id}`);
    } else {
      const a = props.agent;
      const chat = actions.createChat({
        agentId: a.id,
        title: "Untitled",
        assistantName: a.name,
      });
      router.push(`/chat/${chat.id}`);
    }
  }

  function save() {
    if (props.variant !== "marketplace") return;
    actions.toggleSaved(props.assistant.id);
    notifications.show({
      title: "Added to My Agents",
      message: `${props.assistant.name} is now available in My Agents.`,
      color: "brand-blue",
    });
  }

  function remove() {
    if (props.variant !== "marketplace") return;
    actions.toggleSaved(props.assistant.id);
    setConfirmRemove(false);
    notifications.show({
      title: "Removed from My Agents",
      message: `${props.assistant.name} was removed from My Agents.`,
      color: "gray",
    });
  }

  return (
    <Box
      style={
        gradientBorder
          ? {
              height: "100%",
              padding: 2,
              borderRadius: "calc(var(--mantine-radius-md) + 2px)",
              background:
                "linear-gradient(135deg, var(--mantine-color-brand-blue-6) 0%, var(--mantine-color-grape-5) 50%, var(--mantine-color-pink-5) 100%)",
            }
          : { height: "100%" }
      }
    >
    <Card
      withBorder={!gradientBorder}
      radius="md"
      padding="md"
      style={{ height: "100%" }}
    >
      <Stack gap="sm" h="100%">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <AgentAvatar
            iconName={entity.iconName}
            bgColor={entity.bgColor}
            imageUrl={entity.imageUrl}
            size={40}
          />
          <Group gap={6} wrap="nowrap">
            {props.variant === "manage" && (
              <Badge
                variant="light"
                color={props.agent.published ? "teal" : "gray"}
                size="sm"
                radius="sm"
              >
                {props.agent.published ? "Published" : "Draft"}
              </Badge>
            )}
            <Badge variant="light" color="brand-blue" size="sm" radius="sm">
              {classification}
            </Badge>
            <ActionIcon
              variant="subtle"
              color={favorited ? "red" : "gray"}
              aria-label={favorited ? "Unfavourite" : "Favourite"}
              onClick={() => actions.toggleFavorite(favoriteId)}
            >
              {favorited ? (
                <IconHeartFilled size={18} />
              ) : (
                <IconHeart size={18} />
              )}
            </ActionIcon>
          </Group>
        </Group>

        <Stack gap={4} style={{ flex: 1, cursor: "pointer" }} onClick={startChat}>
          <Text fw={600} lineClamp={1}>
            {entity.name}
          </Text>
          {props.variant === "marketplace" && (
            <Text size="sm" c="dimmed" lineClamp={1}>
              by {props.assistant.owner}
            </Text>
          )}
          <Text fz={16} c="dimmed" lineClamp={3}>
            {entity.description}
          </Text>
        </Stack>

        {props.variant === "marketplace" ? (
          isOwnedAgent ? (
            <Text size="xs" c="dimmed">
              Note: You created this agent. Turn it on or off and manage its
              settings from My Agents.
            </Text>
          ) : props.assistant.saved ? (
            <Button
              variant="outline"
              color="red"
              size="sm"
              radius="md"
              w="fit-content"
              onClick={() => setConfirmRemove(true)}
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
                onClick={save}
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
          )
        ) : (
          <Group justify="space-between" align="center" wrap="nowrap">
            <EnabledSwitch
              agentId={props.agent.id}
              enabled={props.agent.enabled}
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
                  onClick={() => router.push(`/agents/${props.agent.id}`)}
                >
                  Edit
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFlask size={16} />}
                  onClick={() =>
                    router.push(`/agents/${props.agent.id}?tab=test`)
                  }
                >
                  Test
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconMessage size={16} />}
                  onClick={startChat}
                >
                  Chat
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconClock size={16} />}
                  onClick={() =>
                    router.push(`/scheduled?agentId=${props.agent.id}`)
                  }
                >
                  Schedule this agent
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => props.onDelete(props.agent.id)}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Stack>

      {props.variant === "marketplace" && (
        <Modal
          opened={confirmRemove}
          onClose={() => setConfirmRemove(false)}
          title="Remove from My Agents?"
          centered
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm">
              {props.assistant.name} will be removed from My Agents. You can add
              it again from the marketplace anytime.
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button
                variant="default"
                size="sm"
                onClick={() => setConfirmRemove(false)}
              >
                Cancel
              </Button>
              <Button color="red" size="sm" onClick={remove}>
                Remove
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Card>
    </Box>
  );
}

/**
 * Enabled toggle + explanatory tooltip, shared by the "manage" card footer and
 * owned agents shown in the marketplace.
 */
function EnabledSwitch({
  agentId,
  enabled,
}: {
  agentId: string;
  enabled: boolean;
}) {
  return (
    <Group gap={6} wrap="nowrap" align="center">
      <Switch
        checked={enabled}
        onChange={() => actions.toggleAgentEnabled(agentId)}
        aria-label="Toggle enabled"
      />
      <Tooltip
        label="When on, Desk can use this agent in chats and tasks. When off, it won't be used."
        multiline
        w={240}
        withArrow
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="What does this toggle do?"
        >
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
