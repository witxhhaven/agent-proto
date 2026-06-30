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
import { withSchedulingQuestion } from "@/data/onboarding";
import { createId } from "@/lib/id";

function draftFromTemplate(t: AgentTemplate): AgentDraftState {
  return {
    templateId: t.id,
    name: t.id === "scratch" ? "" : t.name,
    description: t.shortDescription,
    iconName: t.iconName,
    bgColor: t.bgColor,
    greeting: t.defaultGreeting ?? "",
    responseSpeed: "balanced",
    instructions: t.defaultInstructions,
    knowledgeBase: { sources: t.defaultKnowledge?.sources ?? [] },
    toolIds: t.defaultToolIds,
    questions: (() => {
      const base = t.defaultQuestions.map((prompt) => ({
        id: createId("q"),
        prompt,
      }));
      return t.defaultSchedulingQuestion === false
        ? base
        : withSchedulingQuestion(base);
    })(),
    enabled: true,
    published: false,
  };
}

export default function NewAgentPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<AgentDraftState | null>(null);
  const [assistSeed, setAssistSeed] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(true);

  function close() {
    setModalOpen(false);
    if (!draft) router.push("/agents");
  }

  if (draft) {
    return <AgentEditor initial={draft} isNew assistSeed={assistSeed} />;
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
        // Open the editor with an empty draft and hand the description to the
        // AI-assist chat, which fills the form conversationally from the first turn.
        setDraft(emptyDraft());
        setAssistSeed(description);
        setModalOpen(false);
      }}
      onScratch={() => {
        setDraft(emptyDraft());
        setModalOpen(false);
      }}
    />
  );
}
