import type { Agent, AgentTemplate } from "@/types";

export const agentTemplates: AgentTemplate[] = [
  {
    id: "email-reply",
    name: "Email Reply Assistant",
    shortDescription: "Draft replies in a consistent tone.",
    description:
      "Reads an incoming email and drafts a reply in the tone and style you specify.",
    iconName: "IconMail",
    bgColor: "#4F46E5",
    defaultInstructions:
      "You draft email replies. Match the requested tone, keep replies concise, and always end with a clear next step. Ask for clarification if the incoming email is ambiguous.",
    defaultToolIds: ["g_gmail_send", "g_gmail_search"],
    defaultQuestions: [
      "What tone should replies use?",
      "Who is the sender's typical audience?",
    ],
    defaultKnowledge: {
      snippets: [
        {
          id: "kb_email_voice",
          title: "Brand voice",
          content: "Warm, direct, and professional. Avoid jargon and filler.",
        },
      ],
    },
  },
  {
    id: "current-affairs",
    name: "Current Affairs Brief",
    shortDescription: "A daily briefing on chosen topics.",
    description:
      "Compiles a short briefing on the topics you follow, with a neutral summary of each.",
    iconName: "IconNews",
    bgColor: "#2563EB",
    defaultInstructions:
      "You produce concise current-affairs briefings. Group items by topic, summarize neutrally in 2-3 sentences, and flag anything that needs the reader's attention.",
    defaultToolIds: ["g_drive_search"],
    defaultQuestions: [
      "Which topics should the briefing cover?",
      "How long should the briefing be?",
    ],
  },
  {
    id: "research-digest",
    name: "Research Digest",
    shortDescription: "Summarize sources into a digest.",
    description:
      "Gathers sources on a question and returns a structured, cited digest.",
    iconName: "IconSearch",
    bgColor: "#9333EA",
    defaultInstructions:
      "You build research digests. Organize findings by theme, cite sources inline, and end with open questions. Prefer primary sources.",
    defaultToolIds: ["g_drive_search", "g_drive_read", "g_docs_create"],
    defaultQuestions: [
      "What is the research question?",
      "What depth of detail do you need?",
    ],
  },
  {
    id: "scratch",
    name: "Start from scratch",
    shortDescription: "An empty agent you configure yourself.",
    description: "A blank agent. Fill in everything yourself.",
    iconName: "IconRobot",
    bgColor: "#475569",
    defaultInstructions: "",
    defaultToolIds: [],
    defaultQuestions: [],
  },
];

export const seedAgents: Agent[] = [
  {
    id: "agent_inbox_concierge",
    templateId: "email-reply",
    name: "Inbox Concierge",
    description: "Triages and drafts replies to your incoming email.",
    iconName: "IconMail",
    bgColor: "#4F46E5",
    instructions:
      "Triage incoming email by urgency, then draft a reply in a warm but efficient tone. Surface anything that needs a human decision before sending.",
    knowledgeBase: {
      files: [
        { id: "kb_f1", name: "support_macros.pdf", sizeLabel: "84 KB", kind: "pdf" },
      ],
      links: [
        { id: "kb_l1", url: "https://example.com/style-guide", title: "Email style guide" },
      ],
      snippets: [
        {
          id: "kb_s1",
          title: "Signature",
          content: "Best,\nThe Team\nsupport@example.com",
        },
      ],
    },
    toolIds: ["g_gmail_send", "g_gmail_search", "g_cal_free"],
    questions: [
      {
        id: "q_tone",
        prompt: "What tone should replies use?",
        helpText: "This sets the overall voice of every drafted reply.",
      },
      {
        id: "q_priority",
        prompt: "Which senders should always be treated as high priority?",
        allowMultiple: true,
      },
    ],
    enabled: true,
    createdAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "agent_market_pulse",
    templateId: "research-digest",
    name: "Market Pulse",
    description: "Weekly research digest on your watchlist of markets.",
    iconName: "IconChartBar",
    bgColor: "#059669",
    instructions:
      "Each run, pull the latest on the watchlist topics and produce a themed digest with citations and a short 'what changed' summary at the top.",
    knowledgeBase: {
      files: [
        { id: "kb_f2", name: "watchlist.csv", sizeLabel: "3 KB", kind: "csv" },
      ],
      links: [
        { id: "kb_l2", url: "https://example.com/markets", title: "Markets dashboard" },
      ],
      snippets: [
        {
          id: "kb_s2",
          title: "Coverage rules",
          content: "Prefer primary filings and official releases over secondary commentary.",
        },
      ],
    },
    toolIds: ["g_drive_search", "g_drive_read", "g_docs_create"],
    questions: [
      {
        id: "q_focus",
        prompt: "Which markets should the digest focus on this week?",
        allowMultiple: true,
      },
      {
        id: "q_depth",
        prompt: "How deep should each section go?",
        helpText: "Headline-only, standard, or deep-dive.",
      },
    ],
    enabled: false,
    createdAt: "2026-05-12T14:30:00.000Z",
  },
];
