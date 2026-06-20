"use client";

import { createElement } from "react";
import { Avatar } from "@mantine/core";
import { resolveIcon } from "./iconMap";

export interface AgentAvatarProps {
  iconName: string;
  bgColor: string;
  /** Optional image (e.g. "/avatars/foo.png"). Falls back to the icon if unset/broken. */
  imageUrl?: string;
  size?: number;
  radius?: number | string;
}

export function AgentAvatar({
  iconName,
  bgColor,
  imageUrl,
  size = 40,
  radius = "md",
}: AgentAvatarProps) {
  const icon = resolveIcon(iconName);
  return (
    <Avatar
      size={size}
      radius={radius}
      src={imageUrl || null}
      styles={{ placeholder: { backgroundColor: bgColor } }}
    >
      {/* shown when there's no image (or it fails to load) */}
      {createElement(icon, { size: Math.round(size * 0.55), color: "white" })}
    </Avatar>
  );
}
