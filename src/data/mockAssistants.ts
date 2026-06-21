import type { Assistant } from "@/types";

// Names aligned with the GOVTECH Desk screenshots (desk-srn-shots/agent marketplace.png,
// my-agents_saved-agents.png). Every entry carries a cosmetic CCE/SN classification.
// roleRecommended → "Based on your role" row; historyRecommended → "Based on your chat history".
//
// `greeting` + `questions` drive the chat-intake flow when an assistant is opened from the
// marketplace: the greeting is a warm intro followed by a short note on how the agent behaves,
// and the questions are the onboarding MCQs the AI renders before getting to work.
export const mockAssistants: Assistant[] = [
  {
    id: "asst_policy_brief",
    name: "Policy Brief Writer",
    description:
      "Draft policy papers and cabinet memos with proper structure, framing, and recommendations.",
    owner: "GovTech",
    category: "Writing",
    tags: ["policy", "writing", "memo"],
    iconName: "IconFileText",
    bgColor: "#4F46E5",
    greeting:
      "Hi! I draft policy papers and cabinet memos with the structure and framing your audience expects. A couple of quick questions so the brief lands right.\n\nNote: I produce a working draft for an officer to review — I won't cite policy I can't trace to your knowledge sources, and I'll flag anything that needs a decision-maker's judgement.",
    questions: [
      {
        id: "q_doc_type",
        prompt: "What kind of document are we writing?",
        helpText: "e.g. cabinet memo, policy paper, talking points, position note.",
      },
      {
        id: "q_audience",
        prompt: "Who is the primary audience?",
        helpText: "Sets the level of detail and framing.",
      },
    ],
    uses: 12840,
    type: "Official",
    classification: "CCE/SN",
    saved: true,
    roleRecommended: true,
  },
  {
    id: "asst_email_reply",
    name: "Email Reply Drafter",
    description:
      "Scans unread emails and drafts replies using your knowledge sources for context.",
    owner: "GovTech",
    category: "Communication",
    tags: ["email", "replies", "tone"],
    iconName: "IconMail",
    bgColor: "#2563EB",
    imageUrl: "/avatars/template-email-reply.png",
    greeting:
      "Hi! I scan your unread emails and draft replies grounded in your knowledge sources. Let's set a couple of preferences first.\n\nNote: I only read emails from the past 24 hours, and I skip messages that don't need a reply, like newsletters or notifications. Every reply is a draft for you to review before it's sent.",
    questions: [
      {
        id: "q_tone",
        prompt: "What tone should replies use?",
        helpText: "This sets the overall voice of every drafted reply.",
      },
      {
        id: "q_scope",
        prompt: "Which emails should I draft replies for?",
        helpText: "e.g. all that need a reply, only internal, only from specific senders.",
        allowMultiple: true,
      },
    ],
    uses: 9420,
    type: "Official",
    classification: "CCE/SN",
    saved: true,
    roleRecommended: true,
  },
  {
    id: "asst_press_release",
    name: "Press Release Drafter",
    description:
      "Create press releases and media statements for public announcements in your house style.",
    owner: "GovTech",
    category: "Writing",
    tags: ["press", "media", "comms"],
    iconName: "IconNews",
    bgColor: "#0EA5E9",
    greeting:
      "Hi! I draft press releases and media statements in your agency's house style. Tell me a bit about the announcement and I'll take it from there.\n\nNote: I'll produce a publication-ready draft, but I won't invent quotes or figures — anything I'm unsure of I'll mark for you to confirm before release.",
    questions: [
      {
        id: "q_announcement",
        prompt: "What is the announcement about?",
        helpText: "A one-line summary is enough to start.",
      },
      {
        id: "q_format",
        prompt: "What format do you need?",
        helpText: "e.g. press release, media statement, holding reply, Q&A.",
      },
    ],
    uses: 5230,
    type: "Official",
    classification: "CCE/SN",
    saved: true,
    roleRecommended: true,
  },
  {
    id: "asst_slide_deck",
    name: "Slide Deck Generator",
    description:
      "Turn an outline or document into a structured slide deck with speaker notes.",
    owner: "GovTech",
    category: "Productivity",
    tags: ["slides", "deck", "presentation"],
    iconName: "IconChartBar",
    bgColor: "#059669",
    greeting:
      "Hi! I turn an outline or a document into a structured slide deck with speaker notes. A couple of questions so the deck fits your setting.\n\nNote: I'll propose a slide-by-slide structure first so you can adjust the flow before I write the content.",
    questions: [
      {
        id: "q_source",
        prompt: "What should I build the deck from?",
        helpText: "e.g. a rough outline, an existing report, or just a topic.",
      },
      {
        id: "q_length",
        prompt: "How long should the deck be?",
        helpText: "e.g. a 5-slide summary, a 10-15 slide briefing, or a full presentation.",
      },
    ],
    uses: 4150,
    type: "Official",
    classification: "CCE/SN",
    roleRecommended: true,
  },
  {
    id: "asst_deep_research",
    name: "Deep Research Assistant",
    description:
      "Conduct comprehensive research across multiple sources and synthesize the findings into a cited brief.",
    owner: "GovTech",
    category: "Research",
    tags: ["research", "sources", "synthesis"],
    iconName: "IconSearch",
    bgColor: "#9333EA",
    greeting:
      "Hi! I research a topic across multiple sources and synthesise the findings into a cited brief. Let's scope it first.\n\nNote: every claim in my brief carries a citation, and I'll tell you plainly where the evidence is thin rather than filling gaps with guesses.",
    questions: [
      {
        id: "q_question",
        prompt: "What question should the research answer?",
        helpText: "The sharper the question, the more focused the brief.",
      },
      {
        id: "q_depth",
        prompt: "How deep should the brief go?",
        helpText: "Headline scan, standard brief, or deep-dive.",
      },
    ],
    uses: 8890,
    type: "Official",
    classification: "CCE/SN",
    favorited: true,
    historyRecommended: true,
  },
  {
    id: "asst_data_insights",
    name: "Data Insights Analyzer",
    description:
      "Analyze datasets and surface trends, outliers, and plain-language insights with charts.",
    owner: "Quanta",
    category: "Data & Analytics",
    tags: ["data", "charts", "analysis"],
    iconName: "IconChartBar",
    bgColor: "#16A34A",
    greeting:
      "Hi! I analyse datasets and surface trends, outliers, and plain-language insights with charts. Point me at the data and tell me what you're looking for.\n\nNote: I'll state the assumptions behind each finding, and I'll flag where the data is incomplete rather than over-reading it.",
    questions: [
      {
        id: "q_dataset",
        prompt: "What dataset are we analysing?",
        helpText: "e.g. a CSV upload, a linked sheet, or a connected source.",
      },
      {
        id: "q_goal",
        prompt: "What are you hoping to learn?",
        helpText: "e.g. trends over time, outliers, comparisons between groups.",
        allowMultiple: true,
      },
    ],
    uses: 6020,
    type: "Community",
    classification: "CCE/SN",
    historyRecommended: true,
  },
  {
    id: "asst_newsletter",
    name: "Newsletter",
    description:
      "Gathers the latest news from topics of interest, summarises them, and sends them to your Outlook.",
    owner: "GovTech",
    category: "Research",
    tags: ["news", "digest", "newsletter"],
    iconName: "IconBolt",
    bgColor: "#D97706",
    imageUrl: "/avatars/template-current-affairs.png",
    greeting:
      "Hi! I gather the latest news on your topics of interest, summarise it, and send a digest to your Outlook inbox. A few quick questions to tailor it.\n\nNote: I pull from reputable news sources, summarise each item with a link to the original, and only send on the schedule you set — no inbox clutter in between.",
    questions: [
      {
        id: "q_topics",
        prompt: "Which topics should the newsletter cover?",
        helpText: "e.g. AI policy, public health, regional affairs.",
        allowMultiple: true,
      },
      {
        id: "q_cadence",
        prompt: "How often should I send it?",
        helpText: "e.g. daily, every weekday morning, or weekly.",
      },
    ],
    uses: 3540,
    type: "Community",
    classification: "CCE/SN",
    historyRecommended: true,
  },
  {
    id: "asst_knowledge_qa",
    name: "Knowledge Q&A",
    description:
      "Ask questions across your knowledge base and get accurate, grounded answers instantly.",
    owner: "GovTech",
    category: "Productivity",
    tags: ["q&a", "knowledge", "answers"],
    iconName: "IconMessage",
    bgColor: "#0891B2",
    greeting:
      "Hi! Ask me anything across your knowledge base and I'll give you grounded answers, instantly. Let's point me at the right sources first.\n\nNote: I answer only from the sources you connect and cite where each answer comes from — if something isn't covered, I'll say so rather than guess.",
    questions: [
      {
        id: "q_sources",
        prompt: "Which knowledge sources should answers draw from?",
        helpText: "e.g. a Drive folder, a SharePoint site, or uploaded documents.",
        allowMultiple: true,
      },
      {
        id: "q_gap",
        prompt: "What should I do when an answer isn't in the knowledge base?",
        helpText: "e.g. say it's not covered, or suggest where to look next.",
      },
    ],
    uses: 7610,
    type: "Official",
    classification: "CCE/SN",
    historyRecommended: true,
  },
  {
    id: "asst_meeting_notes",
    name: "Meeting Notes Summarizer",
    description:
      "Turns raw meeting transcripts into crisp notes and clear action items.",
    owner: "GovTech",
    category: "Productivity",
    tags: ["meetings", "summary", "notes"],
    iconName: "IconFileText",
    bgColor: "#475569",
    greeting:
      "Hi! Paste in a transcript or notes and I'll turn them into crisp minutes with clear action items. A quick question first.\n\nNote: I capture decisions and owners as I find them and keep the tone neutral — I won't add anything that wasn't in the source.",
    questions: [
      {
        id: "q_format",
        prompt: "What format should the notes follow?",
        helpText: "e.g. decisions + action items, full minutes, or a short summary.",
      },
      {
        id: "q_audience",
        prompt: "Who are the notes for?",
        helpText: "Sets how much context and detail to keep.",
      },
    ],
    uses: 4760,
    type: "Official",
    classification: "CCE/SN",
    sharedWithYou: true,
  },
  {
    id: "asst_calendar_planner",
    name: "Calendar Planner",
    description: "Finds meeting times and drafts agendas across your week.",
    owner: "GovTech",
    category: "Productivity",
    tags: ["calendar", "scheduling", "agenda"],
    iconName: "IconCalendar",
    bgColor: "#DB2777",
    greeting:
      "Hi! I find meeting times that work and draft agendas across your week. Tell me what you're trying to schedule.\n\nNote: I only suggest times that are free on your calendar and never send invites on your behalf — I'll hand you the draft to send.",
    questions: [
      {
        id: "q_meeting",
        prompt: "What are we scheduling?",
        helpText: "e.g. a 1:1, a team sync, or a multi-party workshop.",
      },
      {
        id: "q_window",
        prompt: "What time window should I look at?",
        helpText: "e.g. this week, next week, or mornings only.",
      },
    ],
    uses: 1980,
    type: "Official",
    classification: "CCE/SN",
    sharedWithYou: true,
  },
  {
    id: "asst_idea_coach",
    name: "Idea Coach",
    description: "Brainstorms and pressure-tests ideas with structured prompts.",
    owner: "GovTech",
    category: "Productivity",
    tags: ["ideas", "brainstorm", "coaching"],
    iconName: "IconBulb",
    bgColor: "#CA8A04",
    greeting:
      "Hi! I help you brainstorm and pressure-test ideas with structured prompts. Let's frame what we're working on.\n\nNote: I'll push back and ask hard questions rather than just agreeing — the goal is to make the idea stronger, not to flatter it.",
    questions: [
      {
        id: "q_idea",
        prompt: "What idea or problem are we working on?",
        helpText: "A rough sketch is fine — we'll sharpen it together.",
      },
      {
        id: "q_mode",
        prompt: "What would help most right now?",
        helpText: "e.g. generate options, stress-test a plan, or find the risks.",
        allowMultiple: true,
      },
    ],
    uses: 2740,
    type: "Community",
    classification: "CCE/SN",
  },
  {
    id: "asst_blog_writer",
    name: "Blog Post Writer",
    description: "Expands an outline into a structured, on-voice blog draft.",
    owner: "Wordsmith",
    category: "Writing",
    tags: ["blog", "content", "writing"],
    iconName: "IconWand",
    bgColor: "#DC2626",
    greeting:
      "Hi! Give me an outline or a topic and I'll expand it into a structured, on-voice blog draft. A couple of questions first.\n\nNote: I'll match the voice you describe and propose a structure before writing, so you can steer the angle early.",
    questions: [
      {
        id: "q_topic",
        prompt: "What's the post about?",
        helpText: "An outline, a few bullet points, or just a working title.",
      },
      {
        id: "q_voice",
        prompt: "What voice should the draft use?",
        helpText: "e.g. professional, conversational, or playful.",
      },
    ],
    uses: 3110,
    type: "Community",
    classification: "CCE/SN",
  },
];
