import type { IntakeQuestion } from "@/types";
import { createId } from "@/lib/id";

export interface AgentDraft {
  name?: string;
  description?: string;
  greeting?: string;
  instructions?: string;
  toolIds?: string[];
  questions: IntakeQuestion[];
}

/**
 * Deterministic MOCK draft generator for the agent builder.
 * The `ai/` step upgrades this to call `/api/llm` when a key is present; without
 * a key (or on failure) this mock keeps the flow fully working.
 */
export function mockAgentDraft(
  description: string,
  currentQuestions: IntakeQuestion[] = []
): AgentDraft {
  const topic = description.trim().replace(/\.$/, "");
  const short = topic.length > 60 ? topic.slice(0, 57) + "…" : topic;
  const name = deriveName(topic);

  const baseQuestions = [
    "What outcome do you want from each run?",
    "What tone or format should the output use?",
  ];
  const questions: IntakeQuestion[] =
    currentQuestions.length > 0
      ? currentQuestions
      : baseQuestions.map((prompt) => ({ id: createId("q"), prompt }));

  return {
    name,
    description: short || "A helpful agent",
    greeting: `Hi! I'm ${name}. I can help you with ${
      topic || "your task"
    }. To get started, please answer a few quick questions below.`,
    instructions: `You are an assistant that helps with: ${
      topic || "the user's task"
    }. Be clear and concise, ask for missing details, and produce well-structured output. Always confirm constraints before acting.`,
    toolIds: [],
    questions,
  };
}

function deriveName(topic: string): string {
  if (!topic) return "Untitled Agent";
  const words = topic
    .split(/\s+/)
    .filter((w) => !/^(a|an|the|to|for|of|that|me|my|please)$/i.test(w))
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return (words.join(" ") || "Custom") + " Agent";
}
