"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconCompass,
  IconRobot,
  IconClock,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPlus,
  IconMessage,
  IconMessagePlus,
} from "@tabler/icons-react";
import { actions, useStore } from "@/lib/store";

interface NavItem {
  label: string;
  href: string;
  icon: typeof IconCompass;
}

const NAV: NavItem[] = [
  { label: "Explore", href: "/explore", icon: IconCompass },
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
  const chats = useStore((s) => s.chats);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  function newChat() {
    const chat = actions.createChat({ agentId: null, title: "New chat" });
    router.push(`/chat/${chat.id}`);
  }

  return (
    <Stack h="100%" gap={0} p="xs">
      {/* header row: brand + collapse toggle */}
      <Group justify={collapsed ? "center" : "space-between"} mb="xs" wrap="nowrap">
        {!collapsed && (
          <Text fw={700} size="sm" pl={6}>
            Agent Studio
          </Text>
        )}
        <Tooltip label={collapsed ? "Expand" : "Collapse"} position="right">
          <ActionIcon variant="subtle" color="gray" onClick={onToggle} aria-label="Toggle sidebar">
            {collapsed ? (
              <IconLayoutSidebarLeftExpand size={20} />
            ) : (
              <IconLayoutSidebarLeftCollapse size={20} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* create agent */}
      {collapsed ? (
        <Tooltip label="Create agent" position="right">
          <ActionIcon
            component={Link}
            href="/agents/new"
            variant="filled"
            size="lg"
            mx="auto"
            mb="sm"
            aria-label="Create agent"
          >
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <Button
          component={Link}
          href="/agents/new"
          leftSection={<IconPlus size={16} />}
          mb="sm"
          fullWidth
        >
          Create agent
        </Button>
      )}

      {/* main nav */}
      <Stack gap={2}>
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

      <Divider my="sm" />

      {/* chats section */}
      <Group justify="space-between" px={collapsed ? 0 : 8} mb={4} wrap="nowrap">
        {!collapsed && (
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Chats
          </Text>
        )}
        <Tooltip label="New chat" position="right">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            mx={collapsed ? "auto" : undefined}
            onClick={newChat}
            aria-label="New chat"
          >
            <IconMessagePlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <ScrollArea style={{ flex: 1 }} type="hover">
        {chats.length === 0 ? (
          !collapsed && (
            <Text size="xs" c="dimmed" px={8} py={4}>
              No chats yet.
            </Text>
          )
        ) : (
          <Stack gap={2}>
            {chats.map((chat) => {
              const active = isActive(`/chat/${chat.id}`);
              if (collapsed) {
                return (
                  <Tooltip key={chat.id} label={chat.title} position="right">
                    <ActionIcon
                      component={Link}
                      href={`/chat/${chat.id}`}
                      variant={active ? "light" : "subtle"}
                      color={active ? undefined : "gray"}
                      size="lg"
                      mx="auto"
                      aria-label={chat.title}
                    >
                      <IconMessage size={18} />
                    </ActionIcon>
                  </Tooltip>
                );
              }
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
    </Stack>
  );
}
