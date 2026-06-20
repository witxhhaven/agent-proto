"use client";

import { Box, Button, Group, Menu, Stack, Text, Textarea } from "@mantine/core";
import { IconAt } from "@tabler/icons-react";
import type { Agent, InstructionContent } from "@/types";
import { useStore } from "@/lib/store";
import {
  instructionToPlainText,
  plainTextToInstruction,
} from "@/lib/instructions";
import { AgentAvatar } from "@/components/common/AgentAvatar";

/**
 * Mention-enabled instructions field. Uses the reliable textarea + token
 * approach: the value is plain text containing "@AgentName" tokens; a preview
 * below renders those tokens as agent pills, and "Add agent" inserts a token.
 * Output is InstructionContent segments.
 */
export function AgentMentionInput({
  value,
  onChange,
}: {
  value: InstructionContent;
  onChange: (content: InstructionContent) => void;
}) {
  const agents = useStore((s) => s.agents);
  const text = instructionToPlainText(value);

  function setText(next: string) {
    onChange(plainTextToInstruction(next, agents));
  }

  function insertMention(agent: Agent) {
    const sep = text.length && !text.endsWith(" ") ? " " : "";
    setText(`${text}${sep}@${agent.name} `);
  }

  return (
    <Stack gap="xs">
      <Textarea
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        placeholder="Describe the task… use @ to mention a saved agent"
        autosize
        minRows={3}
      />
      <Group justify="space-between">
        <Menu position="bottom-start" withinPortal disabled={agents.length === 0}>
          <Menu.Target>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconAt size={14} />}
              disabled={agents.length === 0}
            >
              Mention agent
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {agents.map((a) => (
              <Menu.Item
                key={a.id}
                leftSection={
                  <AgentAvatar iconName={a.iconName} bgColor={a.bgColor} size={20} />
                }
                onClick={() => insertMention(a)}
              >
                {a.name}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* pill preview */}
      {value.some((s) => s.type === "agent") && (
        <Box>
          <Text size="xs" c="dimmed" mb={4}>
            Preview
          </Text>
          <Group gap={4} style={{ rowGap: 4 }}>
            {value.map((seg, i) =>
              seg.type === "agent" ? (
                <Group
                  key={i}
                  gap={4}
                  px={6}
                  py={2}
                  wrap="nowrap"
                  style={{
                    background: "var(--mantine-color-indigo-0)",
                    borderRadius: 999,
                  }}
                >
                  <AgentAvatar
                    iconName={seg.iconName}
                    bgColor={seg.bgColor}
                    size={16}
                  />
                  <Text size="xs" fw={500}>
                    {seg.name}
                  </Text>
                </Group>
              ) : (
                <Text key={i} size="xs" component="span">
                  {seg.value}
                </Text>
              )
            )}
          </Group>
        </Box>
      )}
    </Stack>
  );
}
