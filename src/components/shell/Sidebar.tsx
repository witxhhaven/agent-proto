"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCompass,
  IconRobot,
  IconClock,
  IconPlug,
  IconFolderPlus,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPencilPlus,
  IconMessage,
  IconInfoCircle,
  IconRefresh,
  IconSelector,
} from "@tabler/icons-react";
import { actions, useStore } from "@/lib/store";
import { AgentAvatar } from "@/components/common/AgentAvatar";

interface NavItem {
  label: string;
  href: string;
  icon: typeof IconCompass;
}

const NAV: NavItem[] = [
  { label: "Connectors", href: "/connectors", icon: IconPlug },
  { label: "Agent Marketplace", href: "/explore", icon: IconCompass },
  { label: "My Agents", href: "/agents", icon: IconRobot },
  { label: "Scheduled", href: "/scheduled", icon: IconClock },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Only chats with at least one message are surfaced in Recent Chats.
  const chats = useStore((s) => s.chats);
  const recentChats = chats.filter((c) => c.messages.length > 0);
  const assistants = useStore((s) => s.assistants);
  const favourited = assistants.filter((a) => a.favorited).slice(0, 5);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  function startChatWith(assistantId: string, name: string) {
    const chat = actions.createChat({
      agentId: assistantId,
      title: `Chat with ${name}`,
      assistantName: name,
    });
    router.push(`/chat/${chat.id}`);
  }

  function resetDemo() {
    actions.reset();
    notifications.show({
      title: "Demo data reset",
      message: "All agents, schedules, and chats were restored to seed data.",
      color: "brand-blue",
    });
    router.push("/");
  }

  return (
    <Stack h="100%" gap={0} p="xs">
      {/* header row: brand + collapse toggle */}
      <Group
        justify={collapsed ? "center" : "space-between"}
        mb="sm"
        wrap="nowrap"
      >
        {!collapsed && (
          <Group gap={6} wrap="nowrap" pl={6}>
            <Text fw={800} size="md">
              Desk
            </Text>
            <Badge size="xs" variant="light" color="brand-blue" radius="sm">
              BETA
            </Badge>
          </Group>
        )}
        <Tooltip label={collapsed ? "Expand" : "Collapse"} position="right">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onToggle}
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <IconLayoutSidebarLeftExpand size={20} />
            ) : (
              <IconLayoutSidebarLeftCollapse size={20} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* New Chat — top primary action */}
      {collapsed ? (
        <Tooltip label="New Chat" position="right">
          <ActionIcon
            component={Link}
            href="/"
            variant="filled"
            size="lg"
            mx="auto"
            mb="sm"
            aria-label="New Chat"
          >
            <IconPencilPlus size={18} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <Button
          component={Link}
          href="/"
          variant="light"
          justify="flex-start"
          leftSection={<IconPencilPlus size={16} />}
          mb="sm"
          fullWidth
        >
          New Chat
        </Button>
      )}

      {/* New Project — disabled stub */}
      {!collapsed && (
        <Tooltip label="Coming soon" position="right">
          <NavLink
            label="New Project (Coming Soon)"
            leftSection={<IconFolderPlus size={18} />}
            disabled
          />
        </Tooltip>
      )}

      {/* main nav */}
      <Stack gap={2} mt={collapsed ? 0 : 2}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          if (collapsed) {
            return (
              <Tooltip key={item.href} label={item.label} position="right">
                <ActionIcon
                  component={Link}
                  href={item.href}
                  variant={active ? "light" : "subtle"}
                  color={active ? undefined : "gray"}
                  size="lg"
                  mx="auto"
                  aria-label={item.label}
                >
                  <Icon size={20} />
                </ActionIcon>
              </Tooltip>
            );
          }
          return (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<Icon size={18} />}
              active={active}
            />
          );
        })}
      </Stack>

      {/* Favourited Agents */}
      {!collapsed && favourited.length > 0 && (
        <>
          <Divider my="sm" />
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" px={8} mb={4}>
            Favourited Agents
          </Text>
          <Stack gap={2}>
            {favourited.map((a) => (
              <NavLink
                key={a.id}
                label={a.name}
                leftSection={
                  <AgentAvatar
                    iconName={a.iconName}
                    bgColor={a.bgColor}
                    imageUrl={a.imageUrl}
                    size={22}
                  />
                }
                onClick={() => startChatWith(a.id, a.name)}
              />
            ))}
          </Stack>
        </>
      )}

      <Divider my="sm" />

      {/* Recent Chats */}
      {!collapsed && (
        <Group gap={6} px={8} mb={4} wrap="nowrap">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Recent Chats
          </Text>
          <Tooltip
            label="Chats appear here after your first message"
            position="right"
            multiline
            w={200}
          >
            <IconInfoCircle size={13} color="var(--mantine-color-dimmed)" />
          </Tooltip>
        </Group>
      )}

      <ScrollArea style={{ flex: 1 }} type="hover">
        {recentChats.length === 0
          ? !collapsed && (
              <Text size="xs" c="dimmed" px={8} py={4}>
                No chats yet.
              </Text>
            )
          : !collapsed && (
              <Stack gap={2}>
                {recentChats.map((chat) => {
                  const active = isActive(`/chat/${chat.id}`);
                  return (
                    <NavLink
                      key={chat.id}
                      component={Link}
                      href={`/chat/${chat.id}`}
                      active={active}
                      label={
                        <Box>
                          <Text size="sm" lineClamp={1}>
                            {chat.title}
                          </Text>
                          {chat.assistantName && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {chat.assistantName}
                            </Text>
                          )}
                        </Box>
                      }
                      leftSection={<IconMessage size={16} />}
                    />
                  );
                })}
              </Stack>
            )}
      </ScrollArea>

      {/* user profile footer */}
      <Divider my="xs" />
      <Menu position="top-start" width={220} withinPortal>
        <Menu.Target>
          {collapsed ? (
            <Tooltip label="Alvin LEU (GOVTECH)" position="right">
              <ActionIcon variant="subtle" color="gray" size="lg" mx="auto" aria-label="Account">
                <Box
                  w={28}
                  h={28}
                  style={{
                    borderRadius: 999,
                    background: "#111827",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  A
                </Box>
              </ActionIcon>
            </Tooltip>
          ) : (
            <UnstyledButton
              p={6}
              style={{ borderRadius: 8 }}
              aria-label="Account menu"
            >
              <Group gap="sm" wrap="nowrap">
                <Box
                  w={32}
                  h={32}
                  style={{
                    borderRadius: 999,
                    background: "#111827",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  A
                </Box>
                <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
                  Alvin LEU (GOVTECH)
                </Text>
                <IconSelector size={16} color="var(--mantine-color-dimmed)" />
              </Group>
            </UnstyledButton>
          )}
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Alvin LEU (GOVTECH)</Menu.Label>
          <Menu.Item
            leftSection={<IconRefresh size={16} />}
            onClick={resetDemo}
          >
            Reset demo data
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Stack>
  );
}
