import { mockTools } from "@/data/mockTools";
import { createId } from "@/lib/id";
import {
  DRIVE_SERVICES,
  EMAIL_SERVICES,
  type ServiceId,
} from "@/lib/connectors";
import type { IntakeQuestion, McpTool, ToolStepKind } from "@/types";

export type { ToolStepKind };

// Which connected service each tool authenticates against.
const TOOL_SERVICE: Record<string, ServiceId> = {
  g_gmail_send: "gmail",
  g_gmail_search: "gmail",
  m_outlook_send: "outlook",
  m_outlook_search: "outlook",
  g_drive_search: "gdrive",
  g_drive_read: "gdrive",
  g_docs_create: "gdrive",
  m_onedrive_search: "onedrive",
  m_onedrive_read: "onedrive",
  m_word_create: "onedrive",
  m_sharepoint: "sharepoint",
};

// ---------------------------------------------------------------------------
// Classify the selected tools into the email/drive "functions" that drive the
// tool-linked question pills.
// ---------------------------------------------------------------------------
function selectedTools(toolIds: string[]): McpTool[] {
  return toolIds
    .map((id) => mockTools.find((t) => t.id === id))
    .filter((t): t is McpTool => Boolean(t));
}

function isReadEmail(t: McpTool): boolean {
  return t.category === "Email" && t.id.endsWith("_search");
}
function isSendEmail(t: McpTool): boolean {
  return t.category === "Email" && t.id.endsWith("_send");
}
// Reading from a drive: search or read-document tools.
function isReadDrive(t: McpTool): boolean {
  return (
    t.category === "Files" &&
    (t.id.endsWith("_search") || t.id.endsWith("_read"))
  );
}
// Saving to a drive: create-document tools.
function isSaveDrive(t: McpTool): boolean {
  return t.category === "Files" && t.id.endsWith("_create");
}

/** Question kinds the selected tools make available (in display order). */
export function availableKinds(toolIds: string[]): ToolStepKind[] {
  const tools = selectedTools(toolIds);
  const kinds: ToolStepKind[] = [];
  if (tools.some(isReadEmail)) kinds.push("keyword");
  if (tools.some(isSendEmail)) kinds.push("recipients");
  if (tools.some(isReadDrive)) kinds.push("drive_read");
  if (tools.some(isSaveDrive)) kinds.push("drive_save");
  return kinds;
}

/** The tool names a given kind is linked to (for the read-only dialog). */
export function linkedToolNames(kind: ToolStepKind, toolIds: string[]): string[] {
  const tools = selectedTools(toolIds);
  const match =
    kind === "keyword"
      ? isReadEmail
      : kind === "recipients"
        ? isSendEmail
        : kind === "drive_read"
          ? isReadDrive
          : isSaveDrive;
  return tools.filter(match).map((t) => t.name);
}

export function defaultPromptForKind(kind: ToolStepKind): string {
  switch (kind) {
    case "keyword":
      return "Which email account should I connect, and what kinds of emails should I look for?";
    case "recipients":
      return "Which email account should I connect, and who should I send emails to?";
    case "drive_read":
      return "Which cloud drive and folder should I read from?";
    case "drive_save":
      return "Which cloud drive and folder should I save to?";
  }
}

export function kindLabel(kind: ToolStepKind): string {
  switch (kind) {
    case "keyword":
      return "Keyword filter";
    case "recipients":
      return "Recipients";
    case "drive_read":
      return "Read from";
    case "drive_save":
      return "Save to";
  }
}

/** Longer, user-facing label for the "Insert question" menu. */
export function kindMenuLabel(kind: ToolStepKind): string {
  switch (kind) {
    case "keyword":
      return "Which emails to look for";
    case "recipients":
      return "Who to email";
    case "drive_read":
      return "Which folder to read from";
    case "drive_save":
      return "Where to save files";
  }
}

/** Both drive kinds render the same account + folder picker at chat time. */
export function isDriveKind(kind: ToolStepKind): boolean {
  return kind === "drive_read" || kind === "drive_save";
}

function matcherForKind(kind: ToolStepKind): (t: McpTool) => boolean {
  return kind === "keyword"
    ? isReadEmail
    : kind === "recipients"
      ? isSendEmail
      : kind === "drive_read"
        ? isReadDrive
        : isSaveDrive;
}

/**
 * The accounts/services to offer for a kind — only the ones actually used by the
 * agent's selected tools (e.g. only Gmail if the creator chose Gmail send).
 * Falls back to all services of the right family if none resolve.
 */
export function servicesForKind(
  kind: ToolStepKind,
  toolIds: string[]
): ServiceId[] {
  const match = matcherForKind(kind);
  const used = new Set<ServiceId>();
  for (const t of selectedTools(toolIds)) {
    if (!match(t)) continue;
    const s = TOOL_SERVICE[t.id];
    if (s) used.add(s);
  }
  const order = isDriveKind(kind) ? DRIVE_SERVICES : EMAIL_SERVICES;
  const result = order.filter((s) => used.has(s));
  return result.length ? result : order;
}

/** Create a fresh tool-linked question pill. */
export function makeToolStepQuestion(kind: ToolStepKind): IntakeQuestion {
  return { id: createId("q"), prompt: defaultPromptForKind(kind), toolStep: kind };
}

// How many pills of a given kind exist in the list.
export function countPillsOfKind(
  questions: IntakeQuestion[],
  kind: ToolStepKind
): number {
  return questions.filter((q) => q.toolStep === kind).length;
}

/**
 * Keep the tool-linked pills in sync with the selected tools: drop pills whose
 * kind is no longer available, and ensure at least one pill exists for each
 * available kind (added at the START). Returns the same array reference when
 * nothing changed.
 */
export function syncToolStepQuestions(
  questions: IntakeQuestion[],
  toolIds: string[]
): IntakeQuestion[] {
  const needed = availableKinds(toolIds);
  const neededSet = new Set(needed);

  const needsRemoval = questions.some(
    (q) => q.toolStep && !neededSet.has(q.toolStep)
  );
  const presentKinds = new Set(
    questions.filter((q) => q.toolStep).map((q) => q.toolStep as ToolStepKind)
  );
  const missing = needed.filter((k) => !presentKinds.has(k));
  if (!needsRemoval && missing.length === 0) return questions;

  const kept = questions.filter((q) => !q.toolStep || neededSet.has(q.toolStep));
  const additions = missing.map((k) => makeToolStepQuestion(k));
  return [...additions, ...kept];
}
