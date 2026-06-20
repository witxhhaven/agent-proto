"use client";

import { useState } from "react";
import { Badge, Button, Group, Paper, Text } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import type { ScheduledRunLog } from "@/types";

/** One row in a schedule's run history, with an expandable mock response. */
export function ScheduleRunRow({ run }: { run: ScheduledRunLog }) {
  const [open, setOpen] = useState(false);
  const color =
    run.status === "success" ? "green" : run.status === "failed" ? "red" : "blue";
  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Badge variant="light" color={color} size="sm">
            {run.status}
          </Badge>
          <Text size="sm">{new Date(run.ranAt).toLocaleString()}</Text>
          <Text size="xs" c="dimmed">
            {run.source}
            {run.durationMs ? ` · ${(run.durationMs / 1000).toFixed(1)}s` : ""}
          </Text>
        </Group>
        {run.response && (
          <Button
            variant="subtle"
            size="xs"
            rightSection={<IconChevronDown size={14} />}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide" : "View"} response
          </Button>
        )}
      </Group>
      {run.response && open && (
        <Text size="sm" mt="xs" c="dimmed">
          {run.response}
        </Text>
      )}
    </Paper>
  );
}
