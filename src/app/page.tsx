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

// Short, sweet encouragement lead-ins. Each reads naturally followed by ", Alvin".
const GREETINGS = [
  "Let's make today count",
  "Ready when you are",
  "Good to see you",
  "Let's get started",
  "Welcome back",
  "Let's do great things",
  "Time to shine",
  "Let's make it happen",
  "What's on your mind",
  "Let's dive in",
  "Always here to help",
  "Let's build something",
  "Onwards and upwards",
  "Let's get to work",
  "Fresh start ahead",
  "You've got this",
  "Let's tackle it",
  "Ready to roll",
  "Let's make progress",
  "Big things ahead",
];

export default function HomePage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  // Pick a random greeting once per mount. The text node is allowed to differ
  // between the server render and the client (suppressHydrationWarning below).
  const [greeting] = useState(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
  );

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
        <Title
          order={1}
          fw={300}
          c="dimmed"
          style={{ fontSize: 40, letterSpacing: "-0.03em" }}
        >
          <Text span inherit suppressHydrationWarning>
            {greeting}
          </Text>
          ,{" "}
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
