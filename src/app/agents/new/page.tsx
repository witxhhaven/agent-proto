"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentTemplate } from "@/types";
import {
  AgentEditor,
  emptyDraft,
  type AgentDraftState,
} from "@/components/agents/AgentEditor";
import { AgentTemplatesModal } from "@/components/agents/AgentTemplatesModal";
import { mockAgentDraft } from "@/lib/agentDraft";
import { createId } from "@/lib/id";

function draftFromTemplate(t: AgentTemplate): AgentDraftState {
  return {
    templateId: t.id,
    name: t.id === "scratch" ? "" : t.name,
    description: t.shortDescription,
    iconName: t.iconName,
    bgColor: t.bgColor,
    instructions: t.defaultInstructions,
    knowledgeBase: {
      files: t.defaultKnowledge?.files ?? [],
      links: t.defaultKnowledge?.links ?? [],
      snippets: t.defaultKnowledge?.snippets ?? [],
    },
    toolIds: t.defaultToolIds,
    questions: t.defaultQuestions.map((prompt) => ({
      id: createId("q"),
      prompt,
    })),
    enabled: true,
  };
}

export default function NewAgentPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<AgentDraftState | null>(null);
  const [modalOpen, setModalOpen] = useState(true);

  function close() {
    setModalOpen(false);
    if (!draft) router.push("/agents");
  }

  if (draft) {
    return <AgentEditor initial={draft} isNew />;
  }

  return (
    <AgentTemplatesModal
      opened={modalOpen}
      onClose={close}
      onPickTemplate={(t) => {
        setDraft(draftFromTemplate(t));
        setModalOpen(false);
      }}
      onDraftWithAi={(description) => {
        const ai = mockAgentDraft(description, []);
        setDraft({
          ...emptyDraft(),
          name: ai.name ?? "",
          description: ai.description ?? "",
          instructions: ai.instructions ?? "",
          toolIds: ai.toolIds ?? [],
          questions: ai.questions,
        });
        setModalOpen(false);
      }}
      onScratch={() => {
        setDraft(emptyDraft());
        setModalOpen(false);
      }}
    />
  );
}
