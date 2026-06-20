"use client";

import { useState } from "react";
import {
  ActionIcon,
  CheckIcon,
  Combobox,
  Group,
  Paper,
  PillsInput,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { mockTools } from "@/data/mockTools";
import { resolveBrandIcon } from "@/components/common/iconMap";

export interface ToolsSelectProps {
  toolIds: string[];
  onChange: (toolIds: string[]) => void;
}

export function ToolsSelect({ toolIds, onChange }: ToolsSelectProps) {
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });

  function toggle(id: string) {
    onChange(
      toolIds.includes(id)
        ? toolIds.filter((t) => t !== id)
        : [...toolIds, id]
    );
  }

  const selectedTools = mockTools.filter((t) => toolIds.includes(t.id));

  const query = search.trim().toLowerCase();
  const filtered = query
    ? mockTools.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.provider.toLowerCase().includes(query)
      )
    : mockTools;

  const options = filtered.map((tool) => {
    const Brand = resolveBrandIcon(tool.providerBrand);
    const active = toolIds.includes(tool.id);
    return (
      <Combobox.Option value={tool.id} key={tool.id} active={active}>
        <Group gap="sm" wrap="nowrap">
          {active ? <CheckIcon size={12} /> : <span style={{ width: 12 }} />}
          <Stack gap={0}>
            <Text size="sm">{tool.name}</Text>
            <Group gap={4} wrap="nowrap">
              <Brand size={12} />
              <Text size="xs" c="dimmed">
                {tool.provider}
              </Text>
            </Group>
          </Stack>
        </Group>
      </Combobox.Option>
    );
  });

  return (
    <Stack gap="xs">
      <Combobox store={combobox} onOptionSubmit={toggle} withinPortal>
        <Combobox.DropdownTarget>
          <PillsInput onClick={() => combobox.openDropdown()}>
            <PillsInput.Field
              placeholder="Search tools…"
              value={search}
              onChange={(e) => {
                combobox.openDropdown();
                combobox.updateSelectedOptionIndex();
                setSearch(e.currentTarget.value);
              }}
              onFocus={() => combobox.openDropdown()}
              onBlur={() => combobox.closeDropdown()}
            />
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <Combobox.Options mah={280} style={{ overflowY: "auto" }}>
            {options.length > 0 ? (
              options
            ) : (
              <Combobox.Empty>No tools found</Combobox.Empty>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      {/* Selected tools render as cards below the field, each removable. */}
      {selectedTools.length > 0 && (
        <Stack gap="xs">
          {selectedTools.map((tool) => {
            const Brand = resolveBrandIcon(tool.providerBrand);
            return (
              <Paper key={tool.id} withBorder radius="md" p="xs">
                <Group gap="sm" wrap="nowrap" justify="space-between">
                  <Stack gap={0}>
                    <Text size="sm">{tool.name}</Text>
                    <Group gap={4} wrap="nowrap">
                      <Brand size={12} />
                      <Text size="xs" c="dimmed">
                        {tool.provider}
                      </Text>
                    </Group>
                  </Stack>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={`Remove ${tool.name}`}
                    onClick={() => toggle(tool.id)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
