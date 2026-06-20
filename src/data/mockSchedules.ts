import type { ScheduledTask } from "@/types";

const sampleNewsletter = `Today's Biology & Geology Briefing

1. Mitochondrial inheritance — why cellular powerhouses pass down the maternal line.
2. Plate tectonics refresher — how subduction zones recycle the ocean floor.
3. CRISPR basics — a short primer on guide RNAs and cut sites.
4. The rock cycle — igneous, sedimentary, and metamorphic transitions.
5. Photosynthesis vs. chemosynthesis — two ways life captures energy.

Pick one to go deeper on tomorrow!`;

export const seedScheduledTasks: ScheduledTask[] = [
  {
    id: "sched_biology_news",
    title: "Daily Biology and Geology Newsletter",
    instructions: [
      {
        type: "text",
        value:
          "Choose 5 random topics from the file biology_geology_topics.txt. Create a short newsletter with one paragraph per topic, then suggest one to explore further.",
      },
    ],
    agentId: null,
    knowledgeFileRef: "biology_geology_topics.txt",
    timing: { frequency: "daily", hour: 10, minute: 0 },
    enabled: true,
    createdAt: "2026-05-20T08:00:00.000Z",
    lastRun: "2026-06-19T10:00:00.000Z",
    runHistory: [
      {
        id: "run_bn_1",
        ranAt: "2026-06-19T10:00:00.000Z",
        status: "success",
        source: "scheduled",
        response: sampleNewsletter,
        durationMs: 4200,
      },
      {
        id: "run_bn_2",
        ranAt: "2026-06-18T10:00:00.000Z",
        status: "success",
        source: "scheduled",
        response: sampleNewsletter,
        durationMs: 3900,
      },
      {
        id: "run_bn_3",
        ranAt: "2026-06-17T10:00:00.000Z",
        status: "failed",
        source: "scheduled",
        response: "Run failed: knowledge file could not be read (mock).",
        durationMs: 1200,
      },
    ],
    origin: "schedule-page",
  },
  {
    id: "sched_market_pulse_weekly",
    title: "Weekly Market Pulse",
    instructions: [
      {
        type: "text",
        value: "Run the weekly digest and post the summary. Owned by ",
      },
      {
        type: "agent",
        agentId: "agent_market_pulse",
        name: "Market Pulse",
        iconName: "IconChartBar",
        bgColor: "#059669",
      },
      { type: "text", value: "." },
    ],
    agentId: "agent_market_pulse",
    knowledgeFileRef: null,
    timing: { frequency: "weekly", hour: 8, minute: 30, dayOfWeek: 1 },
    enabled: true,
    createdAt: "2026-05-22T12:00:00.000Z",
    lastRun: "2026-06-16T08:30:00.000Z",
    runHistory: [
      {
        id: "run_mp_1",
        ranAt: "2026-06-16T08:30:00.000Z",
        status: "success",
        source: "scheduled",
        response:
          "What changed: two watchlist names reported earnings; sentiment steady. Full digest attached (mock).",
        durationMs: 6100,
      },
      {
        id: "run_mp_2",
        ranAt: "2026-06-09T08:30:00.000Z",
        status: "success",
        source: "scheduled",
        response: "What changed: quiet week, minor revisions only (mock).",
        durationMs: 5400,
      },
    ],
    origin: "schedule-page",
  },
];
