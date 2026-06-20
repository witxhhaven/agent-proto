"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Container,
  Group,
  Menu,
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
  IconChevronDown,
  IconSparkles as IconCustom,
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
import type { AgentDraft } from "@/lib/agentDraft";
import { createId } from "@/lib/id";

export interface AgentDraftState {
  templateId: AgentTemplateId;
  name: string;
  description: string;
  iconName: string;
  bgColor: string;
  instructions: string;
  knowledgeBase: KnowledgeBase;
  toolIds: string[];
  questions: IntakeQuestion[];
  enabled: boolean;
}

export function emptyDraft(): AgentDraftState {
  return {
    templateId: "scratch",
    name: "",
    description: "",
    iconName: "IconRobot",
    bgColor: "#4F46E5",
    instructions: "",
    knowledgeBase: { files: [], links: [], snippets: [] },
    toolIds: [],
    questions: [],
    enabled: true,
  };
}

export function draftFromAgent(agent: Agent): AgentDraftState {
  return {
    templateId: agent.templateId,
    name: agent.name,
    description: agent.description,
    iconName: agent.iconName,
    bgColor: agent.bgColor,
    instructions: agent.instructions,
    knowledgeBase: agent.knowledgeBase,
    toolIds: agent.toolIds,
    questions: agent.questions,
    enabled: agent.enabled,
  };
}

export function AgentEditor({
  initial,
  agentId,
  isNew,
}: {
  initial: AgentDraftState;
  agentId?: string;
  isNew: boolean;
}) {
  const router = useRouter();
  const drawer = useRightDrawer();
  const [draft, setDraft] = useState<AgentDraftState>(initial);

  function patch(p: Partial<AgentDraftState>) {
    setDraft((d) => ({ ...d, ...p }));
  }

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
    drawer.close();
    notifications.show({
      title: "Draft applied",
      message: "The AI suggestions were merged into the form.",
      color: "indigo",
    });
  }

  function openAssist() {
    drawer.open(
      <AiAssistDrawer currentQuestions={draft.questions} onApply={applyAiDraft} />,
      { title: "AI assist" }
    );
  }

  function save() {
    if (!draft.name.trim()) {
      notifications.show({
        title: "Name required",
        message: "Give your agent a name before saving.",
        color: "red",
      });
      return;
    }
    const payload = {
      templateId: draft.templateId,
      name: draft.name.trim(),
      description: draft.description.trim() || "A custom agent.",
      iconName: draft.iconName,
      bgColor: draft.bgColor,
      instructions: draft.instructions,
      knowledgeBase: draft.knowledgeBase,
      toolIds: draft.toolIds,
      questions: draft.questions.filter((q) => q.prompt.trim()),
      enabled: draft.enabled,
    };
    if (isNew || !agentId) {
      actions.createAgent(payload);
    } else {
      actions.updateAgent(agentId, payload);
    }
    notifications.show({
      title: isNew ? "Agent published" : "Agent updated",
      message: `${payload.name} is live in My Agents and the Agent Marketplace.`,
      color: "indigo",
    });
    router.push("/agents");
  }

  return (
    <Box>
      {/* Editor header */}
      <Group
        justify="space-between"
        px="md"
        py="sm"
        wrap="nowrap"
        style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
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
          <AgentAvatar iconName={draft.iconName} bgColor={draft.bgColor} size={28} />
          <Text fw={600} lineClamp={1}>
            {draft.name.trim() || "Untitled Agent"}
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label="AI assist">
            <ActionIcon
              variant="subtle"
              color="indigo"
              onClick={openAssist}
              aria-label="AI assist"
            >
              <IconSparkles size={18} />
            </ActionIcon>
          </Tooltip>
          <Button.Group>
            <Button onClick={save}>Save</Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button px={8} aria-label="Save options">
                  <IconChevronDown size={16} />
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={save}>Save &amp; publish</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Button.Group>
        </Group>
      </Group>

      <Container size="md" py="xl">
        <Tabs defaultValue="settings">
          <Tabs.List mb="lg">
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
            <Tabs.Tab value="test">Test</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="settings">
            <Stack gap="lg">
              {isNew && draft.templateId === "scratch" && (
                <Card withBorder radius="md" padding="lg" bg="gray.0">
                  <Group align="flex-start" gap="md" wrap="nowrap">
                    <ThemeIcon variant="light" size={48} radius="md" color="indigo">
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

              <Field label="Agent Name" required>
                <TextInput
                  placeholder="Untitled Agent"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.currentTarget.value })}
                />
              </Field>

              <Field label="Icon & color">
                <IconColorPicker
                  iconName={draft.iconName}
                  bgColor={draft.bgColor}
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

              <Field label="Knowledge base">
                <KnowledgeBaseField
                  value={draft.knowledgeBase}
                  onChange={(kb) => patch({ knowledgeBase: kb })}
                />
              </Field>

              <Field label="Instructions">
                <Textarea
                  placeholder="Describe how the agent should behave…"
                  value={draft.instructions}
                  onChange={(e) => patch({ instructions: e.currentTarget.value })}
                  autosize
                  minRows={4}
                />
              </Field>

              <Field label="Tools">
                <ToolsSelect
                  toolIds={draft.toolIds}
                  onChange={(toolIds) => patch({ toolIds })}
                />
              </Field>

              <Field label="Intake questions">
                <QuestionsEditor
                  questions={draft.questions}
                  onChange={(questions) => patch({ questions })}
                  onGenerate={openAssist}
                />
              </Field>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="test">
            <AgentTestChat
              name={draft.name}
              instructions={draft.instructions}
              questions={draft.questions}
            />
          </Tabs.Panel>
        </Tabs>
      </Container>
    </Box>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={6}>
      <Text fw={600} size="sm">
        {label}
        {required && (
          <Text span c="red">
            {" "}
            *
          </Text>
        )}
      </Text>
      {children}
    </Stack>
  );
}

// re-export so pages can build initial drafts without importing createId directly
export { createId };
