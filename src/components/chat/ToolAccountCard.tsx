"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  TagsInput,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import {
  connectService,
  useConnectors,
  type ServiceId,
} from "@/lib/connectors";
import { driveFolders } from "@/data/mockDriveFolders";
import { resolveBrandIcon } from "@/components/common/iconMap";
import { isDriveKind, servicesForKind } from "@/lib/toolSteps";
import type { ToolStepKind } from "@/types";
import classes from "./IntakeQuestionCard.module.css";

export interface ToolStepResult {
  account: string;
  keywords?: string[];
  recipients?: string[];
  folder?: string;
}

export interface ToolAccountCardProps {
  kind: ToolStepKind;
  /** Authored question wording shown as the card title. */
  prompt: string;
  /** Agent's selected tools — used to show only the relevant accounts. */
  toolIds: string[];
  onComplete: (result: ToolStepResult) => void;
  onSkip: () => void;
  onSkipAll: () => void;
  onBack: () => void;
  canGoBack: boolean;
}

/**
 * Mandatory tool-linked card. Picks the account/service (connecting first if
 * needed) and collects the kind-specific config: keyword chips (read email),
 * recipient emails (send email), or a folder (drive). No skip — it's required.
 */
export function ToolAccountCard({
  kind,
  prompt,
  toolIds,
  onComplete,
  onSkip,
  onSkipAll,
  onBack,
  canGoBack,
}: ToolAccountCardProps) {
  const connectors = useConnectors();
  const isDrive = isDriveKind(kind);
  const serviceIds = servicesForKind(kind, toolIds);

  const [selectedId, setSelectedId] = useState<ServiceId | null>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [folderLink, setFolderLink] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [connecting, setConnecting] = useState<ServiceId | null>(null);

  async function connect(id: ServiceId) {
    setConnecting(id);
    await connectService(id);
    setConnecting(null);
    setSelectedId(id);
    setFolder(null);
    setFolderLink("");
  }

  const selected = selectedId ? connectors[selectedId] : null;
  const accountReady = !!selected && selected.connected;
  // A pasted link takes precedence over a picked folder.
  const chosenFolder = folderLink.trim() || folder || "";
  const configReady =
    kind === "keyword"
      ? keywords.length > 0
      : kind === "recipients"
        ? recipients.length > 0
        : !!chosenFolder;
  const canContinue = accountReady && configReady;

  function submit() {
    if (!selected) return;
    onComplete({
      account: `${selected.label} — ${selected.email}`,
      keywords: kind === "keyword" ? keywords : undefined,
      recipients: kind === "recipients" ? recipients : undefined,
      folder: isDrive ? chosenFolder : undefined,
    });
  }

  return (
    <Paper withBorder p="md" radius="md" maw={560} className={classes.card}>
      <Stack gap="sm">
        <Badge size="xs" variant="light" color="red" radius="sm" w="fit-content">
          Required
        </Badge>
        <Text fw={600}>{prompt}</Text>

        {/* Account / service picker */}
        <Stack gap={6}>
          {serviceIds.map((id) => {
            const svc = connectors[id];
            const Brand = resolveBrandIcon(svc.brand);
            const active = selectedId === id;
            return (
              <UnstyledButton
                key={id}
                onClick={() => {
                  if (!svc.connected) return;
                  setSelectedId(id);
                  setFolder(null);
                }}
                p="xs"
                style={{
                  borderRadius: 8,
                  cursor: svc.connected ? "pointer" : "default",
                  border: active
                    ? "2px solid var(--mantine-color-brand-blue-5)"
                    : "1px solid var(--mantine-color-gray-3)",
                  background: active
                    ? "var(--mantine-color-brand-blue-0)"
                    : undefined,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Brand size={18} />
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <Text size="sm" fw={500}>
                          {svc.label}
                        </Text>
                        {svc.connected && (
                          <Group gap={4} wrap="nowrap">
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "var(--mantine-color-green-6)",
                              }}
                            />
                            <Text size="xs" c="green.7" fw={500}>
                              Connected
                            </Text>
                          </Group>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {svc.connected ? svc.email : "Not connected"}
                      </Text>
                    </Stack>
                  </Group>
                  {svc.connected ? (
                    active && (
                      <IconCheck
                        size={16}
                        color="var(--mantine-color-brand-blue-6)"
                      />
                    )
                  ) : (
                    <Button
                      size="xs"
                      variant="light"
                      loading={connecting === id}
                      leftSection={
                        connecting === id ? <Loader size={12} /> : undefined
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        void connect(id);
                      }}
                    >
                      {connecting === id ? "Connecting…" : "Connect"}
                    </Button>
                  )}
                </Group>
              </UnstyledButton>
            );
          })}
        </Stack>

        {/* Kind-specific config, shown once an account is chosen */}
        {accountReady && kind === "keyword" && (
          <Stack gap={4} mt="xs">
            <Text size="sm" fw={500}>
              Keywords to look for
            </Text>
            <TagsInput
              value={keywords}
              onChange={setKeywords}
              placeholder="Add a keyword and press Enter"
            />
          </Stack>
        )}
        {accountReady && kind === "recipients" && (
          <Stack gap={4} mt="xs">
            <Text size="sm" fw={500}>
              Recipient email addresses
            </Text>
            <TagsInput
              value={recipients}
              onChange={setRecipients}
              placeholder="Add an email and press Enter"
            />
          </Stack>
        )}
        {accountReady && isDrive && selected && (
          <Stack gap={6} mt="md">
            <Text size="sm" fw={500}>
              Which folder should it use?
            </Text>
            {(driveFolders[selected.id] ?? []).map((f) => {
              const active = !folderLink.trim() && folder === f;
              return (
                <UnstyledButton
                  key={f}
                  onClick={() => {
                    setFolder(f);
                    setFolderLink("");
                  }}
                  p="xs"
                  style={{
                    borderRadius: 8,
                    border: active
                      ? "2px solid var(--mantine-color-brand-blue-5)"
                      : "1px solid var(--mantine-color-gray-3)",
                    background: active
                      ? "var(--mantine-color-brand-blue-0)"
                      : undefined,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm">{f}</Text>
                    {active && (
                      <IconCheck
                        size={16}
                        color="var(--mantine-color-brand-blue-6)"
                      />
                    )}
                  </Group>
                </UnstyledButton>
              );
            })}
            <TextInput
              mt={4}
              value={folderLink}
              onChange={(e) => {
                setFolderLink(e.currentTarget.value);
                if (e.currentTarget.value.trim()) setFolder(null);
              }}
              placeholder="Or paste a folder link…"
            />
          </Stack>
        )}

        <Group justify="space-between">
          <Group gap="xs">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              disabled={!canGoBack}
              onClick={onBack}
            >
              Back
            </Button>
            <Button variant="subtle" color="gray" size="xs" onClick={onSkipAll}>
              Skip all
            </Button>
          </Group>
          <Group gap="xs">
            <Button variant="subtle" color="gray" size="xs" onClick={onSkip}>
              Skip this
            </Button>
            <Button size="xs" disabled={!canContinue} onClick={submit}>
              Continue
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
