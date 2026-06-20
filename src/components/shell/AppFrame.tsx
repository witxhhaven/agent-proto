"use client";

import type { ReactNode } from "react";
import { ActionIcon, AppShell, Box, Burger, Group, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { Sidebar } from "./Sidebar";
import { useRightDrawer } from "./RightDrawerProvider";

export function AppFrame({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>({
    key: "prototype:sidebarCollapsed",
    defaultValue: false,
    getInitialValueInEffect: true,
  });
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const drawer = useRightDrawer();

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
      // Right drawer rendered as an aside so it PUSHES the main content (resizes
      // the grid) instead of floating over it. breakpoint 0 keeps it pushing at
      // every width ("always push").
      aside={{
        width: drawer.width,
        breakpoint: 0,
        collapsed: { desktop: !drawer.isOpen, mobile: !drawer.isOpen },
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

      <AppShell.Main className="app-main">{children}</AppShell.Main>

      <AppShell.Aside p={0}>
        <Box
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Group
            justify="space-between"
            wrap="nowrap"
            px="md"
            py="sm"
            style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
          >
            <Text fw={600}>{drawer.title ?? "Panel"}</Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={drawer.close}
              aria-label="Close panel"
            >
              <IconX size={18} />
            </ActionIcon>
          </Group>
          <Box p="md" style={{ flex: 1, overflowY: "auto" }}>
            {drawer.content}
          </Box>
        </Box>
      </AppShell.Aside>
    </AppShell>
  );
}
