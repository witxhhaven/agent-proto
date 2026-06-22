import { Group } from "@mantine/core";

/**
 * Three bouncing dots — the shared chat "thinking"/loading indicator.
 * Styled by the global `.typing-dot` rule in app/globals.css. Used for the
 * assistant streaming bubble, the schedule create/AI actions, and the intake
 * flow handoff so loading reads consistently everywhere.
 */
export function TypingDots({ h = 20 }: { h?: number }) {
  return (
    <Group gap={4} align="center" h={h} wrap="nowrap">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </Group>
  );
}
