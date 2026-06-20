"use client";

import { useState } from "react";
import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconFile, IconLink, IconNote, IconTrash, IconPlus } from "@tabler/icons-react";
import type { KnowledgeBase } from "@/types";
import { createId } from "@/lib/id";

export interface KnowledgeBaseFieldProps {
  value: KnowledgeBase;
  onChange: (kb: KnowledgeBase) => void;
}

const FAKE_SIZES = ["12 KB", "84 KB", "248 KB", "1.2 MB", "640 KB"];

function kindFromName(name: string): KnowledgeBase["files"][number]["kind"] {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "txt") return "txt";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "csv") return "csv";
  return "other";
}

export function KnowledgeBaseField({ value, onChange }: KnowledgeBaseFieldProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [snipTitle, setSnipTitle] = useState("");
  const [snipBody, setSnipBody] = useState("");

  function addFile(file: File, idx: number) {
    onChange({
      ...value,
      files: [
        ...value.files,
        {
          id: createId("kb"),
          name: file.name,
          sizeLabel: FAKE_SIZES[idx % FAKE_SIZES.length],
          kind: kindFromName(file.name),
        },
      ],
    });
  }

  return (
    <Tabs defaultValue="files" variant="outline">
      <Tabs.List>
        <Tabs.Tab value="files" leftSection={<IconFile size={14} />}>
          Files ({value.files.length})
        </Tabs.Tab>
        <Tabs.Tab value="links" leftSection={<IconLink size={14} />}>
          Links ({value.links.length})
        </Tabs.Tab>
        <Tabs.Tab value="snippets" leftSection={<IconNote size={14} />}>
          Text ({value.snippets.length})
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="files" pt="sm">
        <Stack gap="xs">
          {value.files.map((f) => (
            <Paper key={f.id} withBorder p="xs" radius="sm">
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <IconFile size={16} />
                  <Text size="sm">{f.name}</Text>
                  <Text size="xs" c="dimmed">
                    {f.sizeLabel}
                  </Text>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() =>
                    onChange({
                      ...value,
                      files: value.files.filter((x) => x.id !== f.id),
                    })
                  }
                  aria-label="Remove file"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
          <Button
            component="label"
            variant="light"
            leftSection={<IconPlus size={14} />}
            size="xs"
            w="fit-content"
          >
            Add file
            <input
              type="file"
              hidden
              multiple
              onChange={(e) => {
                const files = Array.from(e.currentTarget.files ?? []);
                files.forEach(addFile);
                e.currentTarget.value = "";
              }}
            />
          </Button>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="links" pt="sm">
        <Stack gap="xs">
          {value.links.map((l) => (
            <Paper key={l.id} withBorder p="xs" radius="sm">
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={0}>
                  <Text size="sm">{l.title || l.url}</Text>
                  {l.title && (
                    <Text size="xs" c="dimmed">
                      {l.url}
                    </Text>
                  )}
                </Stack>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() =>
                    onChange({
                      ...value,
                      links: value.links.filter((x) => x.id !== l.id),
                    })
                  }
                  aria-label="Remove link"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
          <Group align="flex-end" gap="xs">
            <TextInput
              label="URL"
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.currentTarget.value)}
              style={{ flex: 1 }}
              size="xs"
            />
            <TextInput
              label="Title (optional)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.currentTarget.value)}
              style={{ flex: 1 }}
              size="xs"
            />
            <Button
              size="xs"
              disabled={!linkUrl.trim()}
              onClick={() => {
                onChange({
                  ...value,
                  links: [
                    ...value.links,
                    {
                      id: createId("kb"),
                      url: linkUrl.trim(),
                      title: linkTitle.trim() || undefined,
                    },
                  ],
                });
                setLinkUrl("");
                setLinkTitle("");
              }}
            >
              Add
            </Button>
          </Group>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="snippets" pt="sm">
        <Stack gap="xs">
          {value.snippets.map((s) => (
            <Paper key={s.id} withBorder p="xs" radius="sm">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {s.title}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {s.content}
                  </Text>
                </Stack>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() =>
                    onChange({
                      ...value,
                      snippets: value.snippets.filter((x) => x.id !== s.id),
                    })
                  }
                  aria-label="Remove snippet"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
          <TextInput
            label="Title"
            value={snipTitle}
            onChange={(e) => setSnipTitle(e.currentTarget.value)}
            size="xs"
          />
          <Textarea
            label="Content"
            value={snipBody}
            onChange={(e) => setSnipBody(e.currentTarget.value)}
            autosize
            minRows={2}
            size="xs"
          />
          <Button
            size="xs"
            w="fit-content"
            disabled={!snipTitle.trim() || !snipBody.trim()}
            onClick={() => {
              onChange({
                ...value,
                snippets: [
                  ...value.snippets,
                  {
                    id: createId("kb"),
                    title: snipTitle.trim(),
                    content: snipBody.trim(),
                  },
                ],
              });
              setSnipTitle("");
              setSnipBody("");
            }}
          >
            Add snippet
          </Button>
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
}
