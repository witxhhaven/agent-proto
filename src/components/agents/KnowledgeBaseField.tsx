"use client";

import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconBrandGoogleDrive,
  IconCloud,
  IconFile,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import type { KbFile, KbSource, KbSourceType, KnowledgeBase } from "@/types";
import { createId } from "@/lib/id";

export interface KnowledgeBaseFieldProps {
  value: KnowledgeBase;
  onChange: (kb: KnowledgeBase) => void;
}

const FAKE_SIZES = ["12 KB", "84 KB", "248 KB", "1.2 MB", "640 KB"];

const SOURCE_TYPES: { value: KbSourceType; label: string }[] = [
  { value: "file", label: "Upload a file" },
  { value: "google-drive", label: "Google Drive" },
  { value: "sharepoint", label: "SharePoint" },
];

function kindFromName(name: string): KbFile["kind"] {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "txt") return "txt";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "csv") return "csv";
  return "other";
}

function urlPlaceholder(type: KbSourceType): string {
  if (type === "google-drive")
    return "https://drive.google.com/drive/folders/…";
  if (type === "sharepoint")
    return "https://contoso.sharepoint.com/sites/…";
  return "https://…";
}

export function KnowledgeBaseField({ value, onChange }: KnowledgeBaseFieldProps) {
  // Defensive: tolerate any legacy/empty value lacking `sources`.
  const sources = value.sources ?? [];

  function patchSource(id: string, patch: Partial<KbSource>) {
    onChange({
      sources: sources.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  function addSource() {
    onChange({
      sources: [
        ...sources,
        { id: createId("kb"), name: "", type: "file", files: [] },
      ],
    });
  }

  function removeSource(id: string) {
    onChange({ sources: sources.filter((s) => s.id !== id) });
  }

  function addFiles(source: KbSource, files: File[]) {
    const added: KbFile[] = files.map((f, i) => ({
      id: createId("kbf"),
      name: f.name,
      sizeLabel: FAKE_SIZES[(source.files.length + i) % FAKE_SIZES.length],
      kind: kindFromName(f.name),
    }));
    patchSource(source.id, { files: [...source.files, ...added] });
  }

  return (
    <Stack gap="sm">
      {sources.length === 0 && (
        <Text size="sm" c="dimmed">
          No knowledge sources yet. Add a source to give this agent files or a
          linked Drive/SharePoint location to draw from.
        </Text>
      )}

      {sources.map((source) => (
        <Paper key={source.id} withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <TextInput
                label="Source name"
                placeholder="e.g. HR Policy documents"
                value={source.name}
                onChange={(e) =>
                  patchSource(source.id, { name: e.currentTarget.value })
                }
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                mt={28}
                onClick={() => removeSource(source.id)}
                aria-label="Remove source"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>

            <Select
              label="Source type"
              data={SOURCE_TYPES}
              value={source.type}
              allowDeselect={false}
              // Switching type resets the type-specific payload.
              onChange={(v) =>
                v &&
                patchSource(source.id, {
                  type: v as KbSourceType,
                  files: [],
                  url: undefined,
                })
              }
            />

            {source.type === "file" ? (
              <Stack gap="xs">
                {source.files.map((f) => (
                  <Group
                    key={f.id}
                    justify="space-between"
                    wrap="nowrap"
                    px="xs"
                    py={6}
                    style={{
                      border: "1px solid var(--mantine-color-gray-3)",
                      borderRadius: 8,
                    }}
                  >
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                      <IconFile size={16} />
                      <Text size="sm" lineClamp={1}>
                        {f.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {f.sizeLabel}
                      </Text>
                    </Group>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() =>
                        patchSource(source.id, {
                          files: source.files.filter((x) => x.id !== f.id),
                        })
                      }
                      aria-label="Remove file"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button
                  component="label"
                  variant="light"
                  leftSection={<IconUpload size={14} />}
                  size="xs"
                  w="fit-content"
                >
                  {source.files.length ? "Add more files" : "Upload files"}
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files ?? []);
                      if (files.length) addFiles(source, files);
                      e.currentTarget.value = "";
                    }}
                  />
                </Button>
              </Stack>
            ) : (
              <TextInput
                label={
                  source.type === "google-drive"
                    ? "Google Drive URL"
                    : "SharePoint URL"
                }
                leftSection={
                  source.type === "google-drive" ? (
                    <IconBrandGoogleDrive size={16} />
                  ) : (
                    <IconCloud size={16} />
                  )
                }
                placeholder={urlPlaceholder(source.type)}
                value={source.url ?? ""}
                onChange={(e) =>
                  patchSource(source.id, { url: e.currentTarget.value })
                }
              />
            )}
          </Stack>
        </Paper>
      ))}

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        size="sm"
        w="fit-content"
        onClick={addSource}
      >
        Add source
      </Button>
    </Stack>
  );
}
