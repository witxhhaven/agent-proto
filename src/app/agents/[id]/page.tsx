"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@mantine/core";
import { useStore } from "@/lib/store";
import { AgentEditor, draftFromAgent } from "@/components/agents/AgentEditor";
import { EmptyState } from "@/components/common/EmptyState";

export default function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const agent = useStore((s) => s.agents.find((a) => a.id === id));

  if (!agent) {
    return (
      <Container size="md" py="xl">
        <EmptyState
          title="Agent not found"
          description="This agent may have been deleted."
          action={{ label: "Back to My Agents", onClick: () => router.push("/agents") }}
        />
      </Container>
    );
  }

  return <AgentEditor initial={draftFromAgent(agent)} agentId={agent.id} isNew={false} />;
}
