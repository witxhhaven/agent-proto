// ====================================================================
// Marketplace (Explore)
// ====================================================================
export type AssistantCategory =
  | "Writing"
  | "Research"
  | "Data & Analytics"
  | "Productivity"
  | "Communication";

// Cosmetic GovTech data-classification label (display only — no logic/enforcement).
export type DataClassification =
  | "CCE/SN"
  | "C(CE)/SN"
  | "Official (Open)"
  | "Restricted";

export interface Assistant {
  id: string; // same id as the owning Agent when isOwned
  name: string;
  description: string;
  owner: string;
  category: AssistantCategory;
  tags: string[];
  iconName: string; // @tabler/icons-react name (resolved via iconMap)
  bgColor: string; // hex; avatar background
  imageUrl?: string; // optional avatar image (e.g. "/avatars/foo.png"); overrides the icon
  uses: number;
  type: "Official" | "Community" | "Developer";
  classification?: DataClassification; // cosmetic badge on cards; default "CCE/SN"
  favorited?: boolean;
  saved?: boolean; // user clicked "Save to My Agents" → Saved Agents tab
  sharedWithYou?: boolean; // for the "Shared with you" marketplace pill (mock)
  roleRecommended?: boolean; // curated into "Based on your role" row (mock)
  historyRecommended?: boolean; // curated into "Based on your chat history" row (mock)
  isOwned?: boolean; // created by the user
}

// ====================================================================
// MCP tools catalog (mocked — see foundation/mock-data.md)
// ====================================================================
export type ToolProvider = "Google Workspace" | "Microsoft 365";

export interface McpTool {
  id: string;
  name: string; // LINE 1 in the dropdown, e.g. "Gmail — Send email"
  provider: ToolProvider; // LINE 2 text
  providerBrand: "google" | "microsoft"; // -> brand icon in the dropdown line 2
  category?: string; // e.g. "Email", "Calendar", "Files"
}

// ====================================================================
// Knowledge base (mocked — named sources; each is either uploaded files or a
// Google Drive / SharePoint URL).
// ====================================================================
export interface KbFile {
  id: string;
  name: string;
  sizeLabel: string;
  kind: "pdf" | "docx" | "txt" | "xlsx" | "csv" | "other";
}
export type KbSourceType = "file" | "google-drive" | "sharepoint";
export interface KbSource {
  id: string;
  name: string;
  type: KbSourceType;
  /** populated when type === "file" (multiple files allowed per source) */
  files: KbFile[];
  /** populated when type === "google-drive" | "sharepoint" */
  url?: string;
}
export interface KnowledgeBase {
  sources: KbSource[];
}

// ====================================================================
// Agents (My Agents / creation). Published immediately on save.
// ====================================================================
// The four templates shown in the "What would you like to automate?" modal, plus scratch.
export type AgentTemplateId =
  | "qa-chatbot"
  | "meeting-minutes"
  | "email-reply"
  | "document-summariser"
  | "scratch";

/** Starter template — prefills the (fixed) agent form. */
export interface AgentTemplate {
  id: AgentTemplateId;
  name: string;
  shortDescription: string;
  description: string;
  iconName: string;
  bgColor: string;
  defaultInstructions: string;
  defaultToolIds: string[]; // McpTool ids
  defaultQuestions: string[]; // raw question strings
  defaultKnowledge?: Partial<KnowledgeBase>;
}

export interface Agent {
  id: string;
  templateId: AgentTemplateId;
  name: string;
  description: string;
  iconName: string; // avatar icon
  bgColor: string; // avatar background color (hex)
  imageUrl?: string; // optional avatar image (e.g. "/avatars/foo.png"); overrides the icon
  instructions: string;
  knowledgeBase: KnowledgeBase;
  toolIds: string[]; // selected McpTool ids
  questions: IntakeQuestion[]; // MCQ asked at chat start (see intake-questions.md)
  enabled: boolean;
  published?: boolean; // true once submitted to the Agent Marketplace (Save = draft, Publish = live)
  createdAt: string; // ISO
  // No `schedule` here — scheduling is a separate ScheduledTask that may wrap this agent.
}

// ====================================================================
// Intake questions (the AI centerpiece) — unchanged shapes
// ====================================================================
export interface IntakeQuestion {
  id: string;
  prompt: string;
  helpText?: string;
  allowMultiple?: boolean;
}

/** LLM-generated, UI-renderable form of a question (the "text -> render format" output). */
export interface RenderedQuestion {
  id: string;
  prompt: string;
  options: RenderedOption[]; // 2-6
  allowFreeText: boolean; // always true
  allowMultiple: boolean;
  subQuestionOf?: string; // set if the LLM split a parent question
}
export interface RenderedOption {
  id: string;
  label: string;
  description?: string;
}

export interface IntakeAnswer {
  questionId: string;
  prompt: string;
  selectedOptionLabels: string[];
  freeText?: string;
  skipped?: boolean;
}

// ====================================================================
// Scheduling — first-class entity (wraps an agent OR standalone task)
// ====================================================================
export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export interface ScheduleTiming {
  frequency: ScheduleFrequency;
  hour: number; // 0-23
  minute: number; // 0-59
  dayOfWeek?: number; // 0-6 (weekly)
  dayOfMonth?: number; // 1-28 (monthly)
}

/**
 * The instruction field of a standalone schedule is a mention-enabled rich input:
 * plain text interleaved with @agent pills (name + avatar). Stored as ordered segments.
 */
export type InstructionSegment =
  | { type: "text"; value: string }
  | {
      type: "agent";
      agentId: string;
      name: string;
      iconName: string;
      bgColor: string;
    };
export type InstructionContent = InstructionSegment[];

export type ScheduledRunStatus = "success" | "failed" | "running";
export interface ScheduledRunLog {
  id: string;
  ranAt: string; // ISO
  status: ScheduledRunStatus;
  source: "manual" | "scheduled";
  response?: string; // mock output text the user can expand to read
  durationMs?: number;
}

export interface ScheduledTask {
  id: string;
  title: string;
  instructions: InstructionContent; // lightweight task prompt w/ optional @agent mentions
  agentId: string | null; // set when the schedule WRAPS a saved agent
  knowledgeFileRef?: string | null; // optional referenced file name, e.g. "biology_geology_topics.txt"
  timing: ScheduleTiming;
  enabled: boolean;
  createdAt: string; // ISO
  lastRun: string | null; // ISO
  runHistory: ScheduledRunLog[];
  origin: "schedule-page" | "chat"; // where it was created
}

// ====================================================================
// Chat
// ====================================================================
export type MessageRole = "user" | "assistant" | "system";
export type MessageKind =
  | "text"
  | "intake-question"
  | "intake-summary"
  | "schedule-card";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string; // ISO
  kind?: MessageKind;
  renderedQuestion?: RenderedQuestion; // when kind = "intake-question"
  scheduledTaskId?: string; // when kind = "schedule-card"
}

export interface Chat {
  id: string;
  title: string;
  agentId: string | null;
  assistantName?: string;
  messages: Message[];
  createdAt: string; // ISO
  intakeComplete?: boolean;
  intakeAnswers?: IntakeAnswer[];
}
