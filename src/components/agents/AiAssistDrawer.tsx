"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { IntakeQuestion } from "@/types";
import type { AgentDraft } from "@/lib/agentDraft";
import { generateAgentDraft } from "@/lib/structured";

export interface AiAssistDrawerProps {
  currentQuestions: IntakeQuestion[];
  onApply: (draft: AgentDraft) => void;
}

/**
 * Lightweight AI-assist panel scoped to building this agent. Proposes a draft
 * patch the user can Apply or Dismiss. Mock-first (works with no key); the `ai/`
 * step swaps mockAgentDraft for a real /api/llm call behind the same shape.
 */
export function AiAssistDrawer({
  currentQuestions,
  onApply,
}: AiAssistDrawerProps) {
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState<AgentDraft | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    try {
      // Real /api/llm when a key is present; deterministic mock otherwise.
      const draft = await generateAgentDraft(text, currentQuestions);
      setProposal(draft);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Describe what this agent should do and I&apos;ll draft its settings and
        intake questions.
      </Text>
      <Textarea
        placeholder="e.g. Draft replies to citizen enquiries using our FAQ knowledge base"
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        autosize
        minRows={3}
      />
      <Button
        leftSection={<IconSparkles size={16} />}
        onClick={generate}
        loading={loading}
        disabled={!input.trim()}
      >
        Draft with AI
      </Button>

      {proposal && (
        <Paper withBorder p="sm" radius="md">
          <Stack gap="xs">
            <Badge variant="light" color="brand-blue" w="fit-content">
              Proposed changes
            </Badge>
            {proposal.name && (
              <Text size="sm">
                <strong>Name:</strong> {proposal.name}
              </Text>
            )}
            {proposal.description && (
              <Text size="sm">
                <strong>Description:</strong> {proposal.description}
              </Text>
            )}
            {proposal.instructions && (
              <Text size="sm" lineClamp={4}>
                <strong>Instructions:</strong> {proposal.instructions}
              </Text>
            )}
            {proposal.questions.length > 0 && (
              <Text size="sm">
                <strong>Questions:</strong> {proposal.questions.length} drafted
              </Text>
            )}
            <Group justify="flex-end" gap="xs" mt="xs">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => setProposal(null)}
              >
                Dismiss
              </Button>
              <Button
                size="xs"
                onClick={() => {
                  // keep any questions the user already authored
                  onApply({ ...proposal, questions: proposal.questions });
                  setProposal(null);
                }}
              >
                Apply
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* currentQuestions kept available for future "improve existing" flows */}
      <Text size="xs" c="dimmed">
        {currentQuestions.length > 0
          ? `${currentQuestions.length} existing question(s) will be preserved.`
          : "No existing questions yet."}
      </Text>
    </Stack>
  );
}
