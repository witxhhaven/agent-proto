"use client";

import {
  CheckIcon,
  Combobox,
  Group,
  Pill,
  PillsInput,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { mockTools } from "@/data/mockTools";
import { resolveBrandIcon } from "@/components/common/iconMap";

export interface ToolsSelectProps {
  toolIds: string[];
  onChange: (toolIds: string[]) => void;
}

export function ToolsSelect({ toolIds, onChange }: ToolsSelectProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  function toggle(id: string) {
    onChange(
      toolIds.includes(id)
        ? toolIds.filter((t) => t !== id)
        : [...toolIds, id]
    );
  }

  const selectedTools = mockTools.filter((t) => toolIds.includes(t.id));

  const options = mockTools.map((tool) => {
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
    <Combobox store={combobox} onOptionSubmit={toggle} withinPortal>
      <Combobox.DropdownTarget>
        <PillsInput onClick={() => combobox.toggleDropdown()}>
          <Pill.Group>
            {selectedTools.length === 0 ? (
              <PillsInput.Field
                placeholder="Select tools…"
                onFocus={() => combobox.openDropdown()}
                readOnly
              />
            ) : (
              <>
                {selectedTools.map((tool) => (
                  <Pill
                    key={tool.id}
                    withRemoveButton
                    onRemove={() => toggle(tool.id)}
                  >
                    {tool.name}
                  </Pill>
                ))}
                <PillsInput.Field
                  onFocus={() => combobox.openDropdown()}
                  readOnly
                />
              </>
            )}
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options mah={280} style={{ overflowY: "auto" }}>
          {options}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
