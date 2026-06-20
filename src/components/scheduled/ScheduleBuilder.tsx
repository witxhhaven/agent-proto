"use client";

import { Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import type { ScheduleTiming } from "@/types";
import { describeTiming, nextRun } from "@/lib/cron";

const DOW = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function ScheduleBuilder({
  value,
  onChange,
}: {
  value: ScheduleTiming;
  onChange: (t: ScheduleTiming) => void;
}) {
  return (
    <Stack gap="sm">
      <Group grow align="flex-start">
        <Select
          label="Frequency"
          data={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
          value={value.frequency}
          onChange={(v) =>
            v && onChange({ ...value, frequency: v as ScheduleTiming["frequency"] })
          }
          allowDeselect={false}
        />
        <TimeInput
          label="Time"
          value={`${pad(value.hour)}:${pad(value.minute)}`}
          onChange={(e) => {
            const [h, m] = e.currentTarget.value.split(":").map(Number);
            if (!Number.isNaN(h) && !Number.isNaN(m))
              onChange({ ...value, hour: h, minute: m });
          }}
        />
      </Group>

      {value.frequency === "weekly" && (
        <Select
          label="Day of week"
          data={DOW}
          value={String(value.dayOfWeek ?? 1)}
          onChange={(v) => v && onChange({ ...value, dayOfWeek: Number(v) })}
          allowDeselect={false}
        />
      )}

      {value.frequency === "monthly" && (
        <NumberInput
          label="Day of month"
          min={1}
          max={28}
          value={value.dayOfMonth ?? 1}
          onChange={(v) =>
            onChange({ ...value, dayOfMonth: typeof v === "number" ? v : 1 })
          }
        />
      )}

      <Text size="xs" c="dimmed">
        {describeTiming(value)} · next run{" "}
        {nextRun(value).toLocaleString(undefined, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
        })}
      </Text>
    </Stack>
  );
}
