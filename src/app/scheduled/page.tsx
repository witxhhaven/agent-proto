"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Container,
  Group,
  Stack,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconInfoCircle } from "@tabler/icons-react";
import { SCHEDULE_CAP, useStore } from "@/lib/store";
import { ScheduleCard } from "@/components/scheduled/ScheduleCard";
import { ScheduleCreate } from "@/components/scheduled/ScheduleCreate";
import { EmptyState } from "@/components/common/EmptyState";

function ScheduledInner() {
  const tasks = useStore((s) => s.scheduledTasks);
  const searchParams = useSearchParams();
  // "Schedule this agent" deep-links here with ?agentId=… — seed open state from the URL.
  const linkedAgentId = searchParams.get("agentId");
  const [createOpen, setCreateOpen] = useState(!!linkedAgentId);
  const [defaultAgentId, setDefaultAgentId] = useState<string | null>(
    linkedAgentId
  );

  // The quota counts schedules that are switched on (active); toggling one off
  // frees a slot.
  const activeCount = tasks.filter((t) => t.enabled).length;
  const atCap = activeCount >= SCHEDULE_CAP;

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg" wrap="nowrap">
        {/* Quota tag sits beside the title; counts switched-on schedules. */}
        <Group gap="sm" align="center" wrap="nowrap">
          <Title order={2}>Scheduled</Title>
          <Tooltip
            label={`You can have up to ${SCHEDULE_CAP} schedules running at a time. Toggle one off to free up a slot.`}
            multiline
            w={240}
            withArrow
          >
            <Badge
              variant="light"
              color={atCap ? "orange" : "gray"}
              size="xl"
              radius="sm"
              style={{ cursor: "default" }}
              rightSection={<IconInfoCircle size={14} />}
            >
              {activeCount} of {SCHEDULE_CAP} running
            </Badge>
          </Tooltip>
        </Group>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setDefaultAgentId(null);
            setCreateOpen(true);
          }}
          disabled={atCap}
        >
          New schedule
        </Button>
      </Group>

      {tasks.length === 0 ? (
        <EmptyState
          title="No scheduled tasks"
          description="Create a schedule to run an agent or a standalone task on a recurring basis."
          action={{ label: "New schedule", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <Stack gap="sm">
          {tasks.map((t) => (
            <ScheduleCard key={t.id} task={t} />
          ))}
        </Stack>
      )}

      <ScheduleCreate
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultAgentId={defaultAgentId}
      />
    </Container>
  );
}

export default function ScheduledPage() {
  return (
    <Suspense fallback={null}>
      <ScheduledInner />
    </Suspense>
  );
}
