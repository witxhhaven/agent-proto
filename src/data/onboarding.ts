import type { IntakeQuestion } from "@/types";

// The scheduling onboarding question. It is SEEDED (by default) into every
// creator-created agent and the demo seed agents, but it is a normal, editable
// and removable question — not silently injected at runtime. Its stable id lets
// the chat intake render it with concrete schedule options.
export const SCHEDULING_QUESTION_ID = "q-scheduling";

export const SCHEDULING_QUESTION: IntakeQuestion = {
  id: SCHEDULING_QUESTION_ID,
  prompt: "Would you like to run this on a schedule? If so, how often and when?",
  helpText: "e.g. every weekday at 8am, or weekly on Mondays.",
};

/** Append a fresh copy of the scheduling question unless one is already present. */
export function withSchedulingQuestion(
  questions: IntakeQuestion[]
): IntakeQuestion[] {
  if (questions.some((q) => q.id === SCHEDULING_QUESTION_ID)) return questions;
  return [...questions, { ...SCHEDULING_QUESTION }];
}
