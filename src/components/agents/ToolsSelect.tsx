"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  CheckIcon,
  Combobox,
  Group,
  HoverCard,
  Paper,
  PillsInput,
  SimpleGrid,
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

      {/* Added tools live in their own tinted, labelled zone — visually distinct
          from the search field — laid out as a 2-column grid of removable cards,
          each with an info hover-card. */}
      {selectedTools.length > 0 && (
        <Paper withBorder radius="md" p="sm" bg="gray.0">
          <Group gap={8} mb="xs">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Added tools
            </Text>
            <Badge size="sm" variant="light" color="gray" radius="sm">
              {selectedTools.length}
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {selectedTools.map((tool) => {
              const Brand = resolveBrandIcon(tool.providerBrand);
              return (
                <Paper key={tool.id} withBorder radius="md" p="xs" bg="white">
                  <Group gap={4} wrap="nowrap" justify="space-between">
                    {/* Hovering the name/provider reveals the tool details. */}
                    <HoverCard
                      width={250}
                      shadow="md"
                      withArrow
                      position="top"
                      openDelay={200}
                    >
                      <HoverCard.Target>
                        <Stack
                          gap={2}
                          style={{ flex: 1, minWidth: 0, cursor: "help" }}
                        >
                          <Text size="sm" lineClamp={1}>
                            {tool.name}
                          </Text>
                          <Group gap={4} wrap="nowrap">
                            <Brand size={12} />
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {tool.provider}
                            </Text>
                          </Group>
                        </Stack>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Stack gap={6}>
                          <Group gap={6} wrap="nowrap">
                            <Brand size={14} />
                            <Text size="sm" fw={600}>
                              {tool.name}
                            </Text>
                          </Group>
                          <Group gap={6}>
                            {tool.category && (
                              <Badge size="xs" variant="light" color="gray">
                                {tool.category}
                              </Badge>
                            )}
                            <Text size="xs" c="dimmed">
                              {tool.provider}
                            </Text>
                          </Group>
                          {tool.description && (
                            <Text size="xs">{tool.description}</Text>
                          )}
                        </Stack>
                      </HoverCard.Dropdown>
                    </HoverCard>
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
          </SimpleGrid>
        </Paper>
      )}
    </Stack>
  );
}
