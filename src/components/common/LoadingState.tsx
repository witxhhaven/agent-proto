"use client";

import { Center, Loader, Stack, Text } from "@mantine/core";

export interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({ title = "Loading…", description }: LoadingStateProps) {
  return (
    <Center py="xl" mih={220}>
      <Stack align="center" gap="xs" ta="center">
        <Loader />
        <Text fw={600}>{title}</Text>
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
