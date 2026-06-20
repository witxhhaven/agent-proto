import type { ScheduleTiming } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function describeTiming(t: ScheduleTiming): string {
  const time = `${pad(t.hour)}:${pad(t.minute)}`;
  if (t.frequency === "daily") return `Daily at ${time}`;
  if (t.frequency === "weekly")
    return `Weekly on ${DAYS[t.dayOfWeek ?? 1]} at ${time}`;
  return `Monthly on day ${t.dayOfMonth ?? 1} at ${time}`;
}

/** 5-field cron string — display only, nothing executes it. */
export function toCron(t: ScheduleTiming): string {
  const m = t.minute;
  const h = t.hour;
  if (t.frequency === "daily") return `${m} ${h} * * *`;
  if (t.frequency === "weekly") return `${m} ${h} * * ${t.dayOfWeek ?? 1}`;
  return `${m} ${h} ${t.dayOfMonth ?? 1} * *`;
}

export function nextRun(t: ScheduleTiming, from: Date = new Date()): Date {
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setHours(t.hour, t.minute, 0, 0);

  if (t.frequency === "daily") {
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }
  if (t.frequency === "weekly") {
    const target = t.dayOfWeek ?? 1;
    let delta = (target - next.getDay() + 7) % 7;
    if (delta === 0 && next <= from) delta = 7;
    next.setDate(next.getDate() + delta);
    return next;
  }
  // monthly
  const day = t.dayOfMonth ?? 1;
  next.setDate(day);
  if (next <= from) next.setMonth(next.getMonth() + 1);
  return next;
}
