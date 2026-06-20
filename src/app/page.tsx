"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Center, Group, Stack, Text, Title } from "@mantine/core";
import { Composer } from "@/components/chat/Composer";
import { actions } from "@/lib/store";
import { createId } from "@/lib/id";

const SUGGESTIONS = [
  "Help me draft a document",
  "Summarise this content",
  "Create a project plan",
  "Analyse data trends",
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function HomePage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  // A chat is created + persisted only on first send (ChatGPT-style):
  // blank/new chats never appear in the sidebar Recent Chats list.
  function send(text: string) {
    const title = text.length > 48 ? text.slice(0, 48) + "…" : text;
    const chat = actions.createChat({ agentId: null, title });
    actions.appendMessage(chat.id, {
      id: createId("msg"),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      kind: "text",
    });
    router.push(`/chat/${chat.id}`);
  }

  return (
    <Center mih="100dvh" px="md">
      <Stack w="100%" maw={680} gap="lg" pb={80}>
        <Title order={1} fw={600} c="dimmed" style={{ fontSize: 40 }}>
          {greeting()},{" "}
          <Text span inherit c="var(--mantine-color-text)">
            Alvin
          </Text>
        </Title>

        <Composer value={value} onChange={setValue} onSubmit={send} autoFocus />

        <Text size="sm" c="dimmed" px="xs">
          Supports data classification up to{" "}
          <Text span fw={600} c="var(--mantine-color-text)">
            Confidential (Cloud-Eligible)
          </Text>{" "}
          /{" "}
          <Text span fw={600} c="var(--mantine-color-text)">
            Sensitive Normal (C(CE)/SN)
          </Text>
        </Text>

        <Group gap="sm">
          {SUGGESTIONS.map((s) => (
            <Button
              key={s}
              variant="default"
              radius="md"
              onClick={() => setValue(s)}
            >
              {s}
            </Button>
          ))}
        </Group>
        <Box />
      </Stack>
    </Center>
  );
}
