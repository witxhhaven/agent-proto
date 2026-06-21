import type { Agent, AgentTemplate } from "@/types";

// The four templates shown in the "What would you like to automate?" modal, plus scratch.
export const agentTemplates: AgentTemplate[] = [
  {
    id: "qa-chatbot",
    name: "Q&A Chatbot",
    shortDescription: "Answers staff questions from your policies and SOPs.",
    description:
      "Answers staff questions grounded in your policies, SOPs, and knowledge base, with citations.",
    iconName: "IconMessage",
    bgColor: "#4F46E5",
    defaultInstructions:
      "You answer staff questions using only the provided knowledge base. Cite the source for each answer, and say clearly when something is not covered rather than guessing.",
    defaultToolIds: ["g_drive_search", "g_drive_read"],
    defaultQuestions: [
      "Which knowledge sources should answers draw from?",
      "What should happen when an answer isn't in the knowledge base?",
    ],
    defaultKnowledge: {
      sources: [
        {
          id: "kb_qa_scope",
          name: "Approved policy documents",
          type: "google-drive",
          files: [],
          url: "https://drive.google.com/drive/folders/policies",
        },
      ],
    },
  },
  {
    id: "meeting-minutes",
    name: "Meeting Minutes Writer",
    shortDescription: "Turns meeting notes into clear, shareable minutes.",
    description:
      "Turns raw meeting notes or transcripts into clear, shareable minutes with decisions and action items.",
    iconName: "IconFileText",
    bgColor: "#0EA5E9",
    defaultInstructions:
      "You write meeting minutes. Capture attendees, key decisions, and action items with owners. Keep it concise and neutral; flag anything that needs follow-up.",
    defaultToolIds: ["g_docs_create"],
    defaultQuestions: [
      "What format should the minutes follow?",
      "Who is the audience for these minutes?",
    ],
  },
  {
    id: "email-reply",
    name: "Email Reply Drafter",
    shortDescription: "Drafts replies to incoming emails in your tone.",
    description:
      "Reads an incoming email and drafts a reply in the tone and style you specify.",
    iconName: "IconMail",
    bgColor: "#2563EB",
    defaultInstructions:
      "You draft email replies. Match the requested tone, keep replies concise, and always end with a clear next step. Ask for clarification if the incoming email is ambiguous.",
    defaultToolIds: ["g_gmail_send", "g_gmail_search"],
    defaultQuestions: [
      "What tone should replies use?",
      "Who is the sender's typical audience?",
    ],
    defaultKnowledge: {
      sources: [
        {
          id: "kb_email_voice",
          name: "Brand voice guide",
          type: "file",
          files: [
            {
              id: "kb_email_voice_f",
              name: "brand_voice.pdf",
              sizeLabel: "24 KB",
              kind: "pdf",
            },
          ],
        },
      ],
    },
  },
  {
    id: "document-summariser",
    name: "Document Summariser",
    shortDescription: "Condenses long reports and circulars into key points.",
    description:
      "Condenses long reports, circulars, and papers into key points and a short executive summary.",
    iconName: "IconSearch",
    bgColor: "#9333EA",
    defaultInstructions:
      "You summarise long documents. Lead with a 2-3 sentence executive summary, then bullet the key points and any decisions or risks. Preserve figures and dates accurately.",
    defaultToolIds: ["g_drive_search", "g_drive_read"],
    defaultQuestions: [
      "How long should the summary be?",
      "What should the summary emphasise?",
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
    id: "agent_citizen_enquiry",
    templateId: "email-reply",
    name: "Citizen Enquiry Responder",
    description:
      "Drafts clear replies to citizen enquiries using your agency's FAQs and policies.",
    iconName: "IconMessage",
    bgColor: "#2563EB",
    greeting:
      "Hi! I help officers respond to citizen enquiries quickly and accurately, grounded in your agency's FAQs and policies. Let's set a few preferences first.",
    instructions:
      "Draft clear, empathetic replies to citizen enquiries in plain language, grounded in the agency's FAQs and policy documents. Cite the relevant policy or scheme where helpful, keep a professional and respectful tone, and flag anything that needs an officer's judgement before sending.",
    knowledgeBase: {
      sources: [
        {
          id: "kb_f1",
          name: "Agency FAQs",
          type: "file",
          files: [
            { id: "kb_f1_a", name: "citizen_faqs.pdf", sizeLabel: "120 KB", kind: "pdf" },
          ],
        },
        {
          id: "kb_l1",
          name: "Policy handbook",
          type: "sharepoint",
          files: [],
          url: "https://agency.sharepoint.com/sites/policy-handbook",
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
        id: "q_topics",
        prompt: "Which enquiry topics should this agent handle?",
        helpText: "e.g. grants, licensing, appeals, general feedback.",
        allowMultiple: true,
      },
    ],
    enabled: true,
    createdAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "agent_market_pulse",
    templateId: "document-summariser",
    name: "Market Pulse",
    description: "Weekly research digest on your watchlist of markets.",
    iconName: "IconChartBar",
    bgColor: "#059669",
    greeting:
      "Hi! I'm Market Pulse. I put together a weekly research digest on the markets you care about. A few quick questions to tailor it.",
    instructions:
      "Each run, pull the latest on the watchlist topics and produce a themed digest with citations and a short 'what changed' summary at the top.",
    knowledgeBase: {
      sources: [
        {
          id: "kb_f2",
          name: "Watchlist",
          type: "file",
          files: [
            { id: "kb_f2_a", name: "watchlist.csv", sizeLabel: "3 KB", kind: "csv" },
          ],
        },
        {
          id: "kb_l2",
          name: "Markets dashboard",
          type: "google-drive",
          files: [],
          url: "https://drive.google.com/drive/folders/markets",
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
