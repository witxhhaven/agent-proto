"use client";

import { Avatar } from "@mantine/core";
import { resolveIcon } from "./iconMap";

export interface AgentAvatarProps {
  iconName: string;
  bgColor: string;
  size?: number;
  radius?: number | string;
}

export function AgentAvatar({
  iconName,
  bgColor,
  size = 40,
  radius = "md",
}: AgentAvatarProps) {
  const Icon = resolveIcon(iconName);
  return (
    <Avatar size={size} radius={radius} styles={{ placeholder: { backgroundColor: bgColor } }}>
      <Icon size={Math.round(size * 0.55)} color="white" />
    </Avatar>
  );
}
