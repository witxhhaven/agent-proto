"use client";

import { useMemo, useState } from "react";
import {
  Chip,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import type { Assistant, AssistantCategory } from "@/types";
import { useStore } from "@/lib/store";
import { AgentCard } from "@/components/common/AgentCard";
import { EmptyState } from "@/components/common/EmptyState";

const CATEGORIES: AssistantCategory[] = [
  "Writing",
  "Research",
  "Data & Analytics",
  "Productivity",
  "Communication",
];

const PILLS = ["Recommended", "Favourited", "Shared with you", ...CATEGORIES];

export default function ExplorePage() {
  const assistants = useStore((s) => s.assistants);
  const [query, setQuery] = useState("");
  const [pill, setPill] = useState<string>("Recommended");

  const q = query.trim().toLowerCase();
  const isIdle = pill === "Recommended" && q.length === 0;

  const filtered = useMemo(() => {
    return assistants.filter((a) => {
      if (q) {
        const hay = `${a.name} ${a.description} ${a.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (pill === "Favourited") return a.favorited;
      if (pill === "Shared with you") return a.sharedWithYou;
      if (CATEGORIES.includes(pill as AssistantCategory))
        return a.category === pill;
      return true; // Recommended = all
    });
  }, [assistants, q, pill]);

  // Agents you created blend organically into the "Based on your role" row.
  const roleRow = assistants.filter((a) => a.roleRecommended || a.isOwned);
  const historyRow = assistants.filter((a) => a.historyRecommended);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xs" mb="lg">
        <Title order={2}>Agent Marketplace</Title>
        <Text c="dimmed">
          Discover ready-made agents for everyday work — from drafting email
          replies to researching the news. Save the ones you use so your Personal
          AI Assistant can use them to get tasks done.
        </Text>
      </Stack>

      <TextInput
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        placeholder="Search assistants by name, description, or tag"
        leftSection={<IconSearch size={16} />}
        mb="md"
        size="md"
      />

      <Chip.Group multiple={false} value={pill} onChange={setPill}>
        <Group gap="xs" mb="xl">
          {PILLS.map((p) => (
            <Chip
              key={p}
              value={p}
              variant="filled"
              radius="xl"
              styles={{
                // Fully remove the (hidden) checkmark slot so the checked chip
                // doesn't lose horizontal padding vs the unchecked ones.
                iconWrapper: {
                  display: "none",
                  width: 0,
                  marginLeft: 0,
                  marginRight: 0,
                },
                label: {
                  fontSize: 14,
                  height: "auto",
                  paddingTop: 9,
                  paddingBottom: 9,
                  paddingLeft: 16,
                  paddingRight: 16,
                },
              }}
            >
              {p}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      {isIdle ? (
        <Stack gap="xl">
          <CuratedRow title="Based on your role" items={roleRow} />
          <CuratedRow title="Based on your chat history" items={historyRow} />
        </Stack>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No assistants match"
          description="Try a different search or clear the filters."
          action={{
            label: "Clear filters",
            onClick: () => {
              setQuery("");
              setPill("Recommended");
            },
          }}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filtered.map((a) => (
            <AgentCard key={a.id} variant="marketplace" assistant={a} />
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}

function CuratedRow({ title, items }: { title: string; items: Assistant[] }) {
  if (items.length === 0) return null;
  return (
    <Stack gap="sm">
      <Text fw={700} size="lg">
        {title}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {items.map((a) => (
          <AgentCard key={a.id} variant="marketplace" assistant={a} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
