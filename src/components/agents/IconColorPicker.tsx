"use client";

import { Group, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { ICON_PRESETS, COLOR_PRESETS } from "@/data/presets";
import { resolveIcon } from "@/components/common/iconMap";
import { AgentAvatar } from "@/components/common/AgentAvatar";

export interface IconColorPickerProps {
  iconName: string;
  bgColor: string;
  imageUrl?: string;
  onChange: (patch: {
    iconName?: string;
    bgColor?: string;
    imageUrl?: string;
  }) => void;
}

export function IconColorPicker({
  iconName,
  bgColor,
  imageUrl,
  onChange,
}: IconColorPickerProps) {
  return (
    <Group align="flex-start" gap="xl" wrap="nowrap">
      <Stack align="center" gap={4}>
        <AgentAvatar
          iconName={iconName}
          bgColor={bgColor}
          imageUrl={imageUrl}
          size={56}
        />
        <Text size="xs" c="dimmed">
          Preview
        </Text>
      </Stack>

      <Stack gap="md" style={{ flex: 1 }}>
        <TextInput
          label="Avatar image URL (optional)"
          description="Drop a file in public/avatars/ then use e.g. /avatars/my-agent.png. Overrides the icon."
          placeholder="/avatars/my-agent.png"
          value={imageUrl ?? ""}
          onChange={(e) =>
            onChange({ imageUrl: e.currentTarget.value || undefined })
          }
        />
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Icon
          </Text>
          <Group gap="xs">
            {ICON_PRESETS.map((name) => {
              const Icon = resolveIcon(name);
              const selected = name === iconName;
              return (
                <UnstyledButton
                  key={name}
                  onClick={() => onChange({ iconName: name })}
                  aria-label={name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    border: selected
                      ? "2px solid var(--mantine-color-brand-blue-5)"
                      : "1px solid var(--mantine-color-gray-3)",
                  }}
                >
                  <Icon size={18} />
                </UnstyledButton>
              );
            })}
          </Group>
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Background color
          </Text>
          <Group gap="xs">
            {COLOR_PRESETS.map((color) => {
              const selected = color === bgColor;
              return (
                <UnstyledButton
                  key={color}
                  onClick={() => onChange({ bgColor: color })}
                  aria-label={color}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: color,
                    outline: selected
                      ? "2px solid var(--mantine-color-brand-blue-5)"
                      : "none",
                    outlineOffset: 2,
                  }}
                />
              );
            })}
          </Group>
        </Stack>
      </Stack>
    </Group>
  );
}
