"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Container, Group, Stack, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useStore } from "@/lib/store";
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

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Scheduled</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setDefaultAgentId(null);
            setCreateOpen(true);
          }}
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
