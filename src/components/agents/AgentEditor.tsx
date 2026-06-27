"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Container,
  Group,
  List,
  Loader,
  Modal,
  Select,
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
  IconWorldOff,
  IconId,
  IconBrain,
  IconPlug,
  IconMessageQuestion,
} from "@tabler/icons-react";
import type {
  Agent,
  AgentTemplateId,
  IntakeQuestion,
  KnowledgeBase,
  ResponseSpeed,
} from "@/types";
import { actions, AGENT_CAP, useStore } from "@/lib/store";
import { useRightDrawer } from "@/components/shell/RightDrawerProvider";
import { AgentAvatar } from "@/components/common/AgentAvatar";
import { IconColorPicker } from "./IconColorPicker";
import { KnowledgeBaseField } from "./KnowledgeBaseField";
import { ToolsSelect } from "./ToolsSelect";
import { QuestionsEditor } from "./QuestionsEditor";
import { AgentInstructionsInput } from "./AgentInstructionsInput";
import { AgentTestChat } from "./AgentTestChat";
import { AiAssistDrawer } from "./AiAssistDrawer";
import tabClasses from "@/app/agents/segmented-tabs.module.css";
import type { AgentDraft } from "@/lib/agentDraft";
import { withSchedulingQuestion } from "@/data/onboarding";
import { createId } from "@/lib/id";
import { fireConfetti } from "@/lib/confetti";

// Response-speed tiers. Cosmetic in this prototype — stored on the agent and
// shown in the form, but they don't change the mock/LLM call.
const SPEED_OPTIONS: {
  value: ResponseSpeed;
  label: string;
  description: string;
}[] = [
  {
    value: "instant",
    label: "⚡ Instant (Fast)",
    description: "Snappy replies for simple, high-volume tasks.",
  },
  {
    value: "balanced",
    label: "⚖️ Balanced",
    description: "A good mix of speed and depth for most work.",
  },
  {
    value: "thinking",
    label: "🧠 Thinking (Slow)",
    description: "Takes its time to reason through complex problems.",
  },
];

const DEFAULT_SPEED: ResponseSpeed = "balanced";

export interface AgentDraftState {
  templateId: AgentTemplateId;
  name: string;
  description: string;
  iconName: string;
  bgColor: string;
  imageUrl?: string;
  greeting: string;
  responseSpeed: ResponseSpeed;
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
    greeting: "",
    responseSpeed: DEFAULT_SPEED,
    instructions: "",
    knowledgeBase: { sources: [] },
    toolIds: [],
    // New agents are seeded with the (editable, removable) scheduling question.
    questions: withSchedulingQuestion([]),
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
    greeting: agent.greeting ?? "",
    responseSpeed: agent.responseSpeed ?? DEFAULT_SPEED,
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
  // Stable id reserved up-front so the AI-assist history is tied to THIS agent,
  // even before the first save. On create we persist the agent under this id.
  const [assistKey] = useState(() => agentId ?? createId("agent"));
  // True while the AI-assist chat is generating a response — overlays the form.
  const [aiLoading, setAiLoading] = useState(false);
  // "Learn more" explainer (copy + video) for the onboarding questions field.
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [autoOffOpen, setAutoOffOpen] = useState(false);
  // Success modal shown after a brand-new agent is created or an agent is
  // published (each fires confetti). Kind tailors the copy.
  const [successKind, setSuccessKind] = useState<"created" | "published" | null>(
    null
  );
  const seededRef = useRef(false);
  // Whether this agent has been persisted yet: drives New (Create Agent only)
  // vs Created (Save changes + Publish) UI. Becomes true right after first save.
  const isCreated = !!savedId;
  // Shared My Agents quota: agents you've added (saved) + agents switched on.
  const usedCount = useStore(
    (s) =>
      s.agents.filter((a) => a.enabled).length +
      s.assistants.filter((a) => a.saved).length
  );

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
      // Keep the scheduling question seeded even when the AI replaces the set.
      questions: withSchedulingQuestion(
        ai.questions && ai.questions.length ? ai.questions : d.questions
      ),
    }));
  }

  function openAssist(seed?: string) {
    drawer.open(
      <AiAssistDrawer
        assistKey={assistKey}
        currentQuestions={draft.questions}
        onApply={applyAiDraft}
        initialMessage={seed}
        onLoadingChange={setAiLoading}
      />,
      { title: "Describe your agent" }
    );
  }

  // Keep the confetti spraying for as long as the success modal is open; the
  // cleanup stops it when the modal closes (successKind → null) or on unmount.
  useEffect(() => {
    if (successKind === null) return;
    const stop = fireConfetti();
    return stop;
  }, [successKind]);

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
      greeting: draft.greeting.trim() || undefined,
      responseSpeed: draft.responseSpeed,
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
    // Shared My Agents cap: if all slots are full, create the agent switched OFF
    // and tell the user via a modal — rather than silently overflowing the quota.
    if (payload.enabled && usedCount >= AGENT_CAP) {
      payload.enabled = false;
      patch({ enabled: false });
      setAutoOffOpen(true);
    }
    const created = actions.createAgent(payload, assistKey);
    setSavedId(created.id);
    return created.id;
  }

  // Create Agent = the first save for a brand-new agent. On success, celebrate
  // with the confetti + "Agent created" modal (unless the cap kicked in, in which
  // case persist() already surfaced the switched-off explainer instead).
  function createAgent() {
    const wouldBeCapped = draft.enabled && usedCount >= AGENT_CAP;
    const id = persist();
    if (!id || wouldBeCapped) return;
    setSuccessKind("created");
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
    setSuccessKind("published");
  }

  // Unpublish = remove the agent from the Marketplace (it stays in My Agents).
  function confirmUnpublish() {
    if (savedId) actions.unpublishAgent(savedId);
    patch({ published: false });
    setUnpublishOpen(false);
    notifications.show({
      title: "Removed from the Marketplace",
      message: `${draft.name.trim() || "This agent"} is no longer published. It's still in My Agents.`,
      color: "gray",
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
          {isCreated ? (
            <>
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
                Save changes
              </Button>
              {draft.published ? (
                <Button
                  color="red"
                  leftSection={<IconWorldOff size={16} />}
                  onClick={() => setUnpublishOpen(true)}
                >
                  Unpublish
                </Button>
              ) : (
                <Button
                  leftSection={<IconWorldUpload size={16} />}
                  onClick={openPublish}
                >
                  Publish
                </Button>
              )}
            </>
          ) : (
            <Button onClick={createAgent}>Create Agent</Button>
          )}
        </Group>
      </Group>

      {/* Build-with-AI toggle — sticks just below the header, anchored to the
          editor column's right edge so it follows the header on scroll and moves
          inward (never covering the drawer) when AI assist is open. */}
      <Box
        px="md"
        style={{
          position: "sticky",
          top: 64,
          zIndex: 150,
          height: 0,
          display: "flex",
          justifyContent: "flex-end",
          pointerEvents: "none",
        }}
      >
        <Tooltip
          label={drawer.isOpen ? "Hide" : "Describe your agent"}
          position="left"
          withArrow
        >
          <ActionIcon
            variant={drawer.isOpen ? "filled" : "default"}
            color="brand-blue"
            size="lg"
            radius="xl"
            onClick={() => (drawer.isOpen ? drawer.close() : openAssist())}
            aria-label="Toggle Describe your agent"
            style={{
              pointerEvents: "auto",
              boxShadow: "var(--mantine-shadow-sm)",
            }}
          >
            <IconSparkles size={20} />
          </ActionIcon>
        </Tooltip>
      </Box>

      <Container size="md" py="xl">
          <Tabs.Panel value="settings">
            <Stack gap="xl" pos="relative">
              {/* Gray tint over the form while the AI fills it in. The loader
                  layer spans the form (so it's horizontally centred to the form,
                  not the viewport) and its sticky child keeps the loader
                  vertically centred in view as the form scrolls. */}
              {aiLoading && (
                <>
                  <Box
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 50,
                      backgroundColor: "var(--mantine-color-gray-0)",
                      opacity: 0.85,
                    }}
                  />
                  <Box
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 51,
                      pointerEvents: "none",
                    }}
                  >
                    <Box
                      style={{
                        position: "sticky",
                        top: "50%",
                        display: "flex",
                        justifyContent: "center",
                        transform: "translateY(-50%)",
                      }}
                    >
                      <Loader color="gray.4" />
                    </Box>
                  </Box>
                </>
              )}
              <SectionHeader
                icon={<IconId size={26} />}
                label="Profile"
                first
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
                <Textarea
                  placeholder="Short description shown on the marketplace card"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.currentTarget.value })}
                  autosize
                  minRows={2}
                />
              </Field>

              <SectionHeader
                icon={<IconBrain size={26} />}
                label="Behaviour"
              />

              <Field
                label="Models"
                description="The model the agent uses. Faster options respond quickly; slower options reason more before answering."
              >
                <Select
                  data={SPEED_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  value={draft.responseSpeed}
                  onChange={(value) =>
                    patch({ responseSpeed: (value as ResponseSpeed) ?? DEFAULT_SPEED })
                  }
                  allowDeselect={false}
                  checkIconPosition="right"
                  renderOption={({ option, checked }) => {
                    const meta = SPEED_OPTIONS.find((o) => o.value === option.value);
                    return (
                      <Group gap="sm" wrap="nowrap" justify="space-between" w="100%">
                        <Stack gap={0}>
                          <Text size="sm" fw={checked ? 600 : 500}>
                            {option.label}
                          </Text>
                          {meta && (
                            <Text size="xs" c="dimmed">
                              {meta.description}
                            </Text>
                          )}
                        </Stack>
                      </Group>
                    );
                  }}
                />
              </Field>

              <Field
                label="Instructions"
                description="Tell the agent how to behave, its tone, and what to do. Type @ to mention another agent."
              >
                <AgentInstructionsInput
                  value={draft.instructions}
                  onChange={(instructions) => patch({ instructions })}
                />
              </Field>

              <SectionHeader
                icon={<IconPlug size={26} />}
                label="Knowledge & Tools"
              />

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
                icon={<IconMessageQuestion size={26} />}
                label="Onboarding"
              />

              <Field
                label="Greeting message"
                description="Shown as the agent's first message when a chat starts, before any onboarding questions. Leave blank for none."
              >
                <Textarea
                  placeholder="e.g. Hi! I'm here to help triage your inbox. Let's set things up."
                  value={draft.greeting}
                  onChange={(e) => patch({ greeting: e.currentTarget.value })}
                  autosize
                  minRows={2}
                />
              </Field>

              <Field
                label="Onboarding questions"
                description={
                  <>
                    A quick multiple-choice flow shown when a chat starts,
                    collecting the details this agent needs to perform well.{" "}
                    <Anchor
                      component="button"
                      type="button"
                      fz="sm"
                      c="brand-blue.4"
                      onClick={() => setLearnMoreOpen(true)}
                    >
                      Learn more
                    </Anchor>
                  </>
                }
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
              greeting={draft.greeting}
              questions={draft.questions}
            />
          </Tabs.Panel>
      </Container>
      </Tabs>

      <Modal
        opened={learnMoreOpen}
        onClose={() => setLearnMoreOpen(false)}
        title="How onboarding questions work"
        centered
        size="lg"
        styles={{ title: { fontWeight: 700 } }}
      >
        <Stack gap="md">
          <Text size="sm">
            These questions kick off every new chat. Each one becomes a
            multiple-choice card (plus a free-text option) so users can quickly
            give your agent the context it needs.
          </Text>

          <Box>
            <Text size="sm" fw={600} mb={6}>
              Tips for writing good questions
            </Text>
            <List size="sm" spacing={4}>
              <List.Item>
                Keep each question short and focused on one thing.
              </List.Item>
              <List.Item>
                Only ask what the agent needs to do its job — fewer is better.
              </List.Item>
              <List.Item>
                Order them from broad context to specific details.
              </List.Item>
              <List.Item>
                Write plain questions — the answer options are generated for you.
              </List.Item>
              <List.Item>
                Phrase them neutrally so any answer is a valid one.
              </List.Item>
            </List>
          </Box>

          <Text size="sm">Watch the clip below to see it in action.</Text>
          <video
            src="/videos/onboard-q.mp4"
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%",
              borderRadius: "var(--mantine-radius-md)",
              display: "block",
              backgroundColor: "var(--mantine-color-gray-1)",
              border: "1px solid var(--mantine-color-gray-3)",
            }}
          />
        </Stack>
      </Modal>

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

      <Modal
        opened={unpublishOpen}
        onClose={() => setUnpublishOpen(false)}
        title="Remove from the Agent Marketplace?"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Unpublishing removes{" "}
            <strong>{draft.name.trim() || "this agent"}</strong> from the Agent
            Marketplace so others can no longer discover or use it. It stays in
            My Agents, and you can publish it again anytime.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setUnpublishOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              leftSection={<IconWorldOff size={16} />}
              onClick={confirmUnpublish}
            >
              Unpublish
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={autoOffOpen}
        onClose={() => setAutoOffOpen(false)}
        title="Maximum active agents reached"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Your My Agents quota is full ({AGENT_CAP} of {AGENT_CAP}) — this
            counts the agents you&apos;ve added (saved) plus the ones you&apos;ve
            switched on. We&apos;ve saved{" "}
            <strong>{draft.name.trim() || "this agent"}</strong> and switched it{" "}
            <strong>off</strong> for now. Switch another agent off, or remove a
            saved agent, to free a slot — then switch this one on.
          </Text>
          <Group justify="flex-end">
            <Button onClick={() => setAutoOffOpen(false)}>Got it</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={successKind !== null}
        onClose={() => setSuccessKind(null)}
        centered
        size="lg"
        withCloseButton={false}
      >
        <Stack align="center" gap="md" py="md">
          <Stack align="center" gap={8}>
            {/* Row 1: avatar on its own row */}
            <AgentAvatar
              iconName={draft.iconName}
              bgColor={draft.bgColor}
              imageUrl={draft.imageUrl}
              size={56}
            />
            {/* Row 2: name */}
            <Text fw={700} fz={30} lh={1.1} ta="center" lineClamp={2}>
              {draft.name.trim() || "Your agent"}
            </Text>
            {/* Row 3: status */}
            <Text fw={600} fz={20}>
              {successKind === "published"
                ? "has been published"
                : "has been created"}
            </Text>
          </Stack>
          {/* Explanation */}
          <Text fz={16} c="dimmed" ta="center">
            {successKind === "published"
              ? "It's now live in the Agent Marketplace for others to discover and use."
              : "It's been added to My Agents. Switch it on to start using it in chats and tasks."}
          </Text>
          <Button size="md" px="xl" onClick={() => setSuccessKind(null)}>
            Got it
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}

function SectionHeader({
  icon,
  label,
  first = false,
}: {
  icon: React.ReactNode;
  label: string;
  first?: boolean;
}) {
  return (
    <Group gap={8} wrap="nowrap" mt={first ? 0 : "xl"}>
      <ThemeIcon variant="transparent" color="indigo" size="xl" p={0}>
        {icon}
      </ThemeIcon>
      <Text fw={700} size="xl" c="indigo">
        {label}
      </Text>
    </Group>
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
  description?: React.ReactNode;
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
