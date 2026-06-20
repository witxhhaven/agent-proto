"use client";

import type { ReactNode } from "react";
import { Button, Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void } | ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Center py="xl" mih={220}>
      <Stack align="center" gap="xs" maw={420} ta="center">
        <ThemeIcon variant="light" size={56} radius="xl" color="gray">
          {icon ?? <IconInbox size={28} />}
        </ThemeIcon>
        <Text fw={600} size="lg">
          {title}
        </Text>
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
        {action &&
          (isActionConfig(action) ? (
            <Button mt="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : (
            action
          ))}
      </Stack>
    </Center>
  );
}

function isActionConfig(
  action: NonNullable<EmptyStateProps["action"]>
): action is { label: string; onClick: () => void } {
  return (
    typeof action === "object" &&
    action !== null &&
    "label" in action &&
    "onClick" in action
  );
}
