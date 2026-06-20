"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Modal,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconSparkles,
  IconWorldUpload,
  IconSparkles as IconCustom,
  IconId,
  IconBrain,
  IconMessageQuestion,
} from "@tabler/icons-react";
import type { Agent, AgentTemplateId, IntakeQuestion, KnowledgeBase } from "@/types";
import { actions } from "@/lib/store";
import { useRightDrawer } from "@/components/shell/RightDrawerProvider";
import { AgentAvatar } from "@/components/common/AgentAvatar";
import { IconColorPicker } from "./IconColorPicker";
import { KnowledgeBaseField } from "./KnowledgeBaseField";
import { ToolsSelect } from "./ToolsSelect";
import { QuestionsEditor } from "./QuestionsEditor";
import { AgentTestChat } from "./AgentTestChat";
import { AiAssistDrawer } from "./AiAssistDrawer";
import tabClasses from "@/app/agents/segmented-tabs.module.css";
import type { AgentDraft } from "@/lib/agentDraft";
import { createId } from "@/lib/id";

export interface AgentDraftState {
  templateId: AgentTemplateId;
  name: string;
  description: string;
  iconName: string;
  bgColor: string;
  imageUrl?: string;
  instructions: string;
  knowledgeBase: KnowledgeBase;
  toolIds: string[];
  questions: IntakeQuestion[];
  enabled: boolean;
  published: boolean;
}

export function emptyDraft(): AgentDraftState {
  return {
    templateId: "scratch",
    name: "",
    description: "",
    iconName: "IconRobot",
    bgColor: "#4F46E5",
    imageUrl: undefined,
    instructions: "",
    knowledgeBase: { sources: [] },
    toolIds: [],
    questions: [],
    enabled: true,
    published: false,
  };
}

export function draftFromAgent(agent: Agent): AgentDraftState {
  return {
    templateId: agent.templateId,
    name: agent.name,
    description: agent.description,
    iconName: agent.iconName,
    bgColor: agent.bgColor,
    imageUrl: agent.imageUrl,
    instructions: agent.instructions,
    knowledgeBase: agent.knowledgeBase,
    toolIds: agent.toolIds,
    questions: agent.questions,
    enabled: agent.enabled,
    published: agent.published ?? false,
  };
}

export function AgentEditor({
  initial,
  agentId,
  isNew,
  assistSeed,
}: {
  initial: AgentDraftState;
  agentId?: string;
  isNew: boolean;
  /** Description from the "Draft with AI" modal — seeds the assist chat. */
  assistSeed?: string;
}) {
  const router = useRouter();
  const drawer = useRightDrawer();
  const [draft, setDraft] = useState<AgentDraftState>(initial);
  const [savedId, setSavedId] = useState<string | null>(agentId ?? null);
  const [publishOpen, setPublishOpen] = useState(false);
  const seededRef = useRef(false);

  function patch(p: Partial<AgentDraftState>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  // Live-merge an AI draft into the form without closing the assist chat, so the
  // creator can keep refining it conversationally.
  function applyAiDraft(ai: AgentDraft) {
    setDraft((d) => ({
      ...d,
      name: ai.name ?? d.name,
      description: ai.description ?? d.description,
      instructions: ai.instructions ?? d.instructions,
      toolIds: ai.toolIds && ai.toolIds.length ? ai.toolIds : d.toolIds,
      questions:
        ai.questions && ai.questions.length ? ai.questions : d.questions,
    }));
  }

  function openAssist(seed?: string) {
    drawer.open(
      <AiAssistDrawer
        currentQuestions={draft.questions}
        onApply={applyAiDraft}
        initialMessage={seed}
      />,
      { title: "AI assist" }
    );
  }

  // Arriving from the "Draft with AI" modal: open the assist chat seeded with
  // the creator's description so it fills the form on the first turn.
  useEffect(() => {
    if (assistSeed && !seededRef.current) {
      seededRef.current = true;
      openAssist(assistSeed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistSeed]);

  function buildPayload() {
    return {
      templateId: draft.templateId,
      name: draft.name.trim(),
      description: draft.description.trim() || "A custom agent.",
      iconName: draft.iconName,
      bgColor: draft.bgColor,
      imageUrl: draft.imageUrl,
      instructions: draft.instructions,
      knowledgeBase: draft.knowledgeBase,
      toolIds: draft.toolIds,
      questions: draft.questions.filter((q) => q.prompt.trim()),
      enabled: draft.enabled,
      published: draft.published,
    };
  }

  // Create on first save, update thereafter. Returns the agent id (or null if
  // validation failed). Both Save and Publish persist via this; neither navigates
  // away — the creator stays in the editor.
  function persist(): string | null {
    if (!draft.name.trim()) {
      notifications.show({
        title: "Name required",
        message: "Give your agent a name before saving.",
        color: "red",
      });
      return null;
    }
    const payload = buildPayload();
    if (savedId) {
      actions.updateAgent(savedId, payload);
      return savedId;
    }
    const created = actions.createAgent(payload);
    setSavedId(created.id);
    return created.id;
  }

  // Save = keep it in My Agents as a draft (not in the Marketplace yet).
  function save() {
    const id = persist();
    if (!id) return;
    notifications.show({
      title: draft.published ? "Changes saved" : "Saved to My Agents",
      message: draft.published
        ? `${draft.name.trim()} has been updated.`
        : `${draft.name.trim()} is saved in My Agents as a draft. Publish it to add it to the Marketplace.`,
      color: "brand-blue",
    });
  }

  function openPublish() {
    if (!draft.name.trim()) {
      notifications.show({
        title: "Name required",
        message: "Give your agent a name before publishing.",
        color: "red",
      });
      return;
    }
    setPublishOpen(true);
  }

  // Publish = submit to the Marketplace. Cosmetically "needs admin review", but in
  // this prototype it appears immediately.
  function confirmPublish() {
    const id = persist();
    if (!id) {
      setPublishOpen(false);
      return;
    }
    actions.publishAgent(id);
    patch({ published: true });
    setPublishOpen(false);
    notifications.show({
      title: "Submitted to the Marketplace",
      message: `${draft.name.trim()} is now live in the Agent Marketplace.`,
      color: "brand-blue",
    });
  }

  return (
    <Box>
      <Tabs defaultValue="settings" variant="pills">
      {/* Editor header — tabs centred within it */}
      <Group
        justify="space-between"
        px="md"
        py="sm"
        wrap="nowrap"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          minHeight: 56,
          backgroundColor: "var(--mantine-color-gray-0)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => router.push("/agents")}
            aria-label="Back"
          >
            <IconArrowLeft size={18} />
          </ActionIcon>
          <AgentAvatar
            iconName={draft.iconName}
            bgColor={draft.bgColor}
            imageUrl={draft.imageUrl}
            size={28}
          />
          <Text fw={600} lineClamp={1}>
            {draft.name.trim() || "Untitled Agent"}
          </Text>
        </Group>
        <Box
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Tabs.List className={tabClasses.list}>
            <Tabs.Tab value="settings" className={tabClasses.tab}>
              Settings
            </Tabs.Tab>
            <Tabs.Tab value="test" className={tabClasses.tab}>
              Test
            </Tabs.Tab>
          </Tabs.List>
        </Box>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label={drawer.isOpen ? "Hide AI assist" : "AI assist"}>
            <ActionIcon
              variant={drawer.isOpen ? "filled" : "subtle"}
              color="brand-blue"
              onClick={() => (drawer.isOpen ? drawer.close() : openAssist())}
              aria-label="Toggle AI assist"
            >
              <IconSparkles size={18} />
            </ActionIcon>
          </Tooltip>
          <Button
            variant="outline"
            onClick={save}
            styles={{
              root: {
                borderColor: "#000",
                color: "#000",
                backgroundColor: "#fff",
              },
            }}
          >
            Save
          </Button>
          <Button
            leftSection={<IconWorldUpload size={16} />}
            onClick={openPublish}
            disabled={draft.published}
          >
            {draft.published ? "Published" : "Publish"}
          </Button>
        </Group>
      </Group>

      <Container size="md" py="xl">
          <Tabs.Panel value="settings">
            <Stack gap="xl">
              {isNew && draft.templateId === "scratch" && (
                <Card withBorder radius="md" padding="lg" bg="gray.0">
                  <Group align="flex-start" gap="md" wrap="nowrap">
                    <ThemeIcon variant="light" size={48} radius="md" color="brand-blue">
                      <IconCustom size={26} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text fw={600}>Custom Agent</Text>
                      <Text size="sm" c="dimmed">
                        Start from a blank agent and configure it yourself, or let
                        the AI assistant help you set it up.
                      </Text>
                    </Stack>
                  </Group>
                </Card>
              )}

              <SectionHeader
                icon={<IconId size={22} />}
                label="Profile"
                description="How the agent appears in the marketplace and chats."
                withLine={false}
              />

              <Field label="Agent name" required>
                <TextInput
                  placeholder="Untitled Agent"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.currentTarget.value })}
                />
              </Field>

              <Field label="Icon & colour">
                <IconColorPicker
                  iconName={draft.iconName}
                  bgColor={draft.bgColor}
                  imageUrl={draft.imageUrl}
                  onChange={(p) => patch(p)}
                />
              </Field>

              <Field label="Description">
                <TextInput
                  placeholder="Short description shown on the marketplace card"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.currentTarget.value })}
                />
              </Field>

              <SectionHeader
                icon={<IconBrain size={22} />}
                label="Capabilities"
                description="What the agent knows and can do."
              />

              <Field
                label="Instructions"
                description="Tell the agent how to behave, its tone, and what to do."
              >
                <Textarea
                  placeholder="Describe how the agent should behave…"
                  value={draft.instructions}
                  onChange={(e) => patch({ instructions: e.currentTarget.value })}
                  autosize
                  minRows={4}
                />
              </Field>

              <Field
                label="Knowledge base"
                description="Reference files and links the agent can draw on."
              >
                <KnowledgeBaseField
                  value={draft.knowledgeBase}
                  onChange={(kb) => patch({ knowledgeBase: kb })}
                />
              </Field>

              <Field
                label="Tools"
                description="Connected actions the agent can use, like email or files."
              >
                <ToolsSelect
                  toolIds={draft.toolIds}
                  onChange={(toolIds) => patch({ toolIds })}
                />
              </Field>

              <SectionHeader
                icon={<IconMessageQuestion size={22} />}
                label="Onboarding"
                description="What the agent asks users when a chat starts."
              />

              <Field
                label="Onboarding questions"
                description="A quick multiple-choice flow shown when a chat starts, collecting the details this agent needs to perform well."
              >
                <QuestionsEditor
                  questions={draft.questions}
                  onChange={(questions) => patch({ questions })}
                />
              </Field>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="test">
            <AgentTestChat
              name={draft.name}
              description={draft.description}
              instructions={draft.instructions}
              questions={draft.questions}
            />
          </Tabs.Panel>
      </Container>
      </Tabs>

      <Modal
        opened={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish to the Agent Marketplace?"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Publishing submits{" "}
            <strong>{draft.name.trim() || "this agent"}</strong> to the Agent
            Marketplace. It will need to be reviewed and approved by the
            administrators before it goes live, which may take a while.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              leftSection={<IconWorldUpload size={16} />}
              onClick={confirmPublish}
            >
              Publish
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

function SectionHeader({
  icon,
  label,
  description,
  withLine = true,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  withLine?: boolean;
}) {
  return (
    <Stack gap={4} mt="sm">
      {withLine && <Divider />}
      <Group gap={8} wrap="nowrap" mt={withLine ? 4 : 0}>
        <ThemeIcon variant="transparent" color="brand-blue" size="lg" p={0}>
          {icon}
        </ThemeIcon>
        <Text fw={700} size="lg">
          {label}
        </Text>
      </Group>
      {description && (
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      )}
    </Stack>
  );
}

function Field({
  label,
  icon,
  required,
  description,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <Group gap={8} wrap="nowrap">
          {icon && (
            <ThemeIcon variant="light" size="md" radius="sm" color="brand-blue">
              {icon}
            </ThemeIcon>
          )}
          <Text fw={600} size="md">
            {label}
            {required && (
              <Text span c="red">
                {" "}
                *
              </Text>
            )}
          </Text>
        </Group>
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
      </Stack>
      {children}
    </Stack>
  );
}

// re-export so pages can build initial drafts without importing createId directly
export { createId };
