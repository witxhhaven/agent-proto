"use client";

import { useSyncExternalStore } from "react";
import type {
  Agent,
  Assistant,
  Chat,
  Message,
  ScheduledRunLog,
  ScheduledTask,
} from "@/types";
import { createId } from "@/lib/id";
import { mockAssistants } from "@/data/mockAssistants";
import { seedAgents } from "@/data/mockAgents";
import { seedScheduledTasks } from "@/data/mockSchedules";

const KEY = "prototype:v1";

export interface StoreState {
  assistants: Assistant[];
  agents: Agent[];
  scheduledTasks: ScheduledTask[];
  chats: Chat[];
}

// --- seed -----------------------------------------------------------------

/** Derive the marketplace Assistant entry for a user-owned Agent. */
export function deriveAssistant(agent: Agent): Assistant {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    owner: "You",
    category: "Productivity",
    tags: [],
    iconName: agent.iconName,
    bgColor: agent.bgColor,
    uses: 0,
    type: "Developer",
    isOwned: true,
  };
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

function seedState(): StoreState {
  const agents = clone(seedAgents);
  return {
    assistants: [...clone(mockAssistants), ...agents.map(deriveAssistant)],
    agents,
    scheduledTasks: clone(seedScheduledTasks),
    chats: [],
  };
}

// Stable seed snapshot for the server (and the initial client paint before
// hydration). Computed once so the reference is stable.
const SERVER_SNAPSHOT: StoreState = seedState();

// --- state + subscription -------------------------------------------------

let state: StoreState = SERVER_SNAPSHOT;
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors in the prototype
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      state = JSON.parse(raw) as StoreState;
    } else {
      // first visit — seed a fresh, isolated copy and persist it
      state = seedState();
      persist();
    }
  } catch {
    state = seedState();
  }
}

function emit() {
  for (const l of listeners) l();
}

function setState(next: StoreState) {
  state = next;
  persist();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreState {
  ensureHydrated();
  return state;
}

function getServerSnapshot(): StoreState {
  return SERVER_SNAPSHOT;
}

/**
 * Read a slice of the store. Re-renders when the store changes.
 * NOTE: return references that live in state (e.g. `s.agents`) or primitives —
 * do not build a new array/object inside the selector or you'll loop.
 */
export function useStore<T>(selector: (s: StoreState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot())
  );
}

/** Imperative read outside React (e.g. inside event handlers). */
export function getState(): StoreState {
  return getSnapshot();
}

// --- actions --------------------------------------------------------------

export const actions = {
  // agents -----------------------------------------------------------------
  createAgent(input: Omit<Agent, "id" | "createdAt">): Agent {
    const agent: Agent = {
      ...input,
      id: createId("agent"),
      createdAt: new Date().toISOString(),
    };
    setState({
      ...state,
      agents: [...state.agents, agent],
      assistants: [...state.assistants, deriveAssistant(agent)],
    });
    return agent;
  },

  updateAgent(id: string, patch: Partial<Agent>): void {
    const agents = state.agents.map((a) =>
      a.id === id ? { ...a, ...patch } : a
    );
    const updated = agents.find((a) => a.id === id);
    const assistants = updated
      ? state.assistants.map((as) =>
          as.id === id && as.isOwned
            ? {
                ...as,
                name: updated.name,
                description: updated.description,
                iconName: updated.iconName,
                bgColor: updated.bgColor,
              }
            : as
        )
      : state.assistants;
    setState({ ...state, agents, assistants });
  },

  deleteAgent(id: string): void {
    setState({
      ...state,
      agents: state.agents.filter((a) => a.id !== id),
      assistants: state.assistants.filter((as) => as.id !== id),
    });
  },

  toggleAgentEnabled(id: string): void {
    setState({
      ...state,
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ),
    });
  },

  // scheduled tasks --------------------------------------------------------
  createScheduledTask(
    input: Omit<ScheduledTask, "id" | "createdAt" | "lastRun" | "runHistory">
  ): ScheduledTask {
    const task: ScheduledTask = {
      ...input,
      id: createId("sched"),
      createdAt: new Date().toISOString(),
      lastRun: null,
      runHistory: [],
    };
    setState({ ...state, scheduledTasks: [...state.scheduledTasks, task] });
    return task;
  },

  updateScheduledTask(id: string, patch: Partial<ScheduledTask>): void {
    setState({
      ...state,
      scheduledTasks: state.scheduledTasks.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    });
  },

  deleteScheduledTask(id: string): void {
    setState({
      ...state,
      scheduledTasks: state.scheduledTasks.filter((t) => t.id !== id),
    });
  },

  toggleScheduledTaskEnabled(id: string): void {
    setState({
      ...state,
      scheduledTasks: state.scheduledTasks.map((t) =>
        t.id === id ? { ...t, enabled: !t.enabled } : t
      ),
    });
  },

  runScheduledTaskNow(id: string): void {
    const now = new Date().toISOString();
    const task = state.scheduledTasks.find((t) => t.id === id);
    const log: ScheduledRunLog = {
      id: createId("run"),
      ranAt: now,
      status: "success",
      source: "manual",
      response: task
        ? `Manual run of "${task.title}" completed. (mock response — ${new Date(
            now
          ).toLocaleString()})`
        : "Manual run completed (mock).",
      durationMs: 3000,
    };
    setState({
      ...state,
      scheduledTasks: state.scheduledTasks.map((t) =>
        t.id === id
          ? { ...t, lastRun: now, runHistory: [log, ...t.runHistory] }
          : t
      ),
    });
  },

  // chats ------------------------------------------------------------------
  createChat(input: {
    agentId: string | null;
    title: string;
    assistantName?: string;
  }): Chat {
    const chat: Chat = {
      id: createId("chat"),
      title: input.title,
      agentId: input.agentId,
      assistantName: input.assistantName,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setState({ ...state, chats: [chat, ...state.chats] });
    return chat;
  },

  appendMessage(chatId: string, message: Message): void {
    setState({
      ...state,
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, message] } : c
      ),
    });
  },

  updateChat(chatId: string, patch: Partial<Chat>): void {
    setState({
      ...state,
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, ...patch } : c
      ),
    });
  },

  // marketplace + demo -----------------------------------------------------
  toggleFavorite(assistantId: string): void {
    setState({
      ...state,
      assistants: state.assistants.map((a) =>
        a.id === assistantId ? { ...a, favorited: !a.favorited } : a
      ),
    });
  },

  reset(): void {
    setState(seedState());
  },
};

export const store = { actions, getState, useStore };
