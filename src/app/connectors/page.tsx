"use client";

import {
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBrandGoogle,
  IconBrandWindows,
  IconMail,
  IconBrandSlack,
  IconCloud,
} from "@tabler/icons-react";

const INTEGRATIONS: { name: string; icon: typeof IconMail; color: string }[] = [
  { name: "Gmail", icon: IconMail, color: "#EA4335" },
  { name: "Google Drive", icon: IconBrandGoogle, color: "#1A73E8" },
  { name: "Outlook", icon: IconMail, color: "#0078D4" },
  { name: "OneDrive", icon: IconCloud, color: "#0078D4" },
  { name: "Microsoft 365", icon: IconBrandWindows, color: "#5E5E5E" },
  { name: "Slack", icon: IconBrandSlack, color: "#4A154B" },
];

export default function ConnectorsPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xs" mb="xl">
        <Title order={2}>Connectors</Title>
        <Text c="dimmed">
          Connect your tools so agents can act on your behalf — coming soon.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {INTEGRATIONS.map(({ name, icon: Icon, color }) => (
          <Card key={name} withBorder radius="md" padding="lg" opacity={0.7}>
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <Icon size={28} color={color} />
                <Text fw={600}>{name}</Text>
              </Group>
              <Badge variant="light" color="gray" size="sm">
                Coming soon
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
