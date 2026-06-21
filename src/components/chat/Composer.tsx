"use client";

import {
  ActionIcon,
  Box,
  Group,
  Paper,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconPaperclip, IconArrowUp, IconTools } from "@tabler/icons-react";

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Shows the (cosmetic) tools button on the left of the composer. */
  showTools?: boolean;
}

/**
 * Shared chat composer. Used on the home/welcome screen and in the chat view.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask me anything…",
  disabled = false,
  autoFocus = false,
  showTools = true,
}: ComposerProps) {
  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <Paper withBorder radius="lg" p="sm" shadow="xs">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        variant="unstyled"
        autosize
        minRows={2}
        maxRows={8}
        disabled={disabled}
        autoFocus={autoFocus}
        px="xs"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <Group justify="space-between" mt="xs" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Attach (mock)">
            <ActionIcon variant="subtle" color="gray" aria-label="Attach">
              <IconPaperclip size={18} />
            </ActionIcon>
          </Tooltip>
          {showTools && (
            <Tooltip label="Tools (mock)">
              <ActionIcon variant="subtle" color="gray" aria-label="Tools">
                <IconTools size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <ActionIcon
          variant="filled"
          radius="xl"
          size="lg"
          aria-label="Send"
          disabled={disabled || value.trim().length === 0}
          onClick={submit}
        >
          <IconArrowUp size={18} />
        </ActionIcon>
      </Group>
      <Box />
    </Paper>
  );
}
