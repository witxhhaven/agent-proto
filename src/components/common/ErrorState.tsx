"use client";

import type { ReactNode } from "react";
import { Button, Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface ErrorStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function ErrorState({
  icon,
  title = "Something went wrong",
  description,
  action,
}: ErrorStateProps) {
  return (
    <Center py="xl" mih={220}>
      <Stack align="center" gap="xs" maw={420} ta="center">
        <ThemeIcon variant="light" size={56} radius="xl" color="red">
          {icon ?? <IconAlertTriangle size={28} />}
        </ThemeIcon>
        <Text fw={600} size="lg">
          {title}
        </Text>
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
        {action && (
          <Button mt="sm" variant="light" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </Stack>
    </Center>
  );
}
