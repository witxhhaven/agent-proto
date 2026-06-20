"use client";

import type { ReactNode } from "react";
import { AppShell, Burger, Group, Text } from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { Sidebar } from "./Sidebar";

export function AppFrame({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>({
    key: "prototype:sidebarCollapsed",
    defaultValue: false,
    getInitialValueInEffect: true,
  });
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);

  return (
    <AppShell
      // No header on desktop (the screenshots have no top bar); a slim one on
      // mobile carries the burger to open the navbar.
      header={{ height: { base: 52, sm: 0 } }}
      navbar={{
        width: collapsed ? 72 : 264,
        breakpoint: "sm",
        collapsed: { desktop: false, mobile: !mobileOpened },
      }}
      padding={0}
    >
      <AppShell.Header hiddenFrom="sm">
        <Group h="100%" px="md" gap="sm" wrap="nowrap">
          <Burger opened={mobileOpened} onClick={toggleMobile} size="sm" />
          <Text fw={700}>Desk</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar onClick={closeMobile}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
