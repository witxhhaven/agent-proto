"use client";

import type { ReactNode } from "react";
import {
  AppShell,
  Burger,
  Button,
  Group,
  Text,
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconRefresh } from "@tabler/icons-react";
import { actions } from "@/lib/store";
import { Sidebar } from "./Sidebar";

export function AppFrame({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>({
    key: "prototype:sidebarCollapsed",
    defaultValue: false,
    getInitialValueInEffect: true,
  });
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);

  function resetDemo() {
    actions.reset();
    notifications.show({
      title: "Demo data reset",
      message: "All agents, schedules, and chats were restored to seed data.",
      color: "indigo",
    });
  }

  return (
    <AppShell
      header={{ height: 52 }}
      navbar={{
        width: collapsed ? 64 : 260,
        breakpoint: "sm",
        collapsed: { desktop: false, mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
            <Text fw={700}>Agent Studio</Text>
            <Text size="xs" c="dimmed" visibleFrom="sm">
              prototype
            </Text>
          </Group>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={resetDemo}
          >
            Reset demo data
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar onClick={closeMobile}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
