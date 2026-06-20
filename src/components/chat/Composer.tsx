"use client";

import { useState } from "react";
import {
  ActionIcon,
  Box,
  Group,
  Menu,
  Paper,
  Textarea,
  Tooltip,
  Button,
} from "@mantine/core";
import {
  IconPaperclip,
  IconArrowUp,
  IconShieldCheck,
  IconChevronDown,
} from "@tabler/icons-react";
import type { DataClassification } from "@/types";

const CLASSIFICATION_OPTIONS: DataClassification[] = [
  "C(CE)/SN",
  "Official (Open)",
  "Restricted",
];

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Shows the cosmetic data-classification selector (home + chat). */
  showClassification?: boolean;
}

/**
 * Shared chat composer. Used on the home/welcome screen and in the chat view.
 * The classification selector is cosmetic only — no filtering/enforcement.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask me anything…",
  disabled = false,
  autoFocus = false,
  showClassification = true,
}: ComposerProps) {
  const [classification, setClassification] =
    useState<DataClassification>("C(CE)/SN");

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
        minRows={1}
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
          {showClassification && (
            <Menu position="bottom-start" withinPortal>
              <Menu.Target>
                <Button
                  variant="light"
                  color="brand-blue"
                  size="xs"
                  radius="sm"
                  leftSection={<IconShieldCheck size={14} />}
                  rightSection={<IconChevronDown size={14} />}
                >
                  {classification}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Data classification</Menu.Label>
                {CLASSIFICATION_OPTIONS.map((c) => (
                  <Menu.Item key={c} onClick={() => setClassification(c)}>
                    {c}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
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
