"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Box, Group, Popover, Text, UnstyledButton } from "@mantine/core";
import type { Agent, InstructionContent } from "@/types";
import { useStore } from "@/lib/store";
import { AgentAvatar } from "@/components/common/AgentAvatar";
import { resolveIcon } from "@/components/common/iconMap";

interface PillAgent {
  id: string;
  name: string;
  iconName: string;
  bgColor: string;
  imageUrl?: string;
}

/**
 * Inline @mention instructions field. The value is InstructionContent; mentioned
 * agents render as pills INSIDE the contenteditable surface (not a preview
 * below). Typing "@" opens an agent picker; choosing one inserts a pill inline.
 */
function serialize(content: InstructionContent): string {
  return content
    .map((s) => (s.type === "text" ? s.value : `${s.agentId}`))
    .join("");
}

export function AgentMentionInput({
  value,
  onChange,
  placeholder = "Describe the task… type @ to mention a saved agent",
}: {
  value: InstructionContent;
  onChange: (content: InstructionContent) => void;
  placeholder?: string;
}) {
  const agents = useStore((s) => s.agents);
  const agentsRef = useRef(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  // The pending "@query" location while the picker is open.
  const mention = useRef<{ node: Text; at: number; end: number } | null>(null);

  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");

  // Pill = a small agent avatar (same look as the cards) + the agent name.
  function makePill(agent: PillAgent): HTMLElement {
    const span = document.createElement("span");
    span.contentEditable = "false";
    span.dataset.agentId = agent.id;
    span.className = "mention-pill";

    const avatar = document.createElement("span");
    avatar.className = "mention-pill-avatar";
    avatar.style.backgroundColor = agent.bgColor;
    if (agent.imageUrl) {
      const img = document.createElement("img");
      img.src = agent.imageUrl;
      img.alt = "";
      avatar.appendChild(img);
    } else {
      avatar.innerHTML = renderToStaticMarkup(
        createElement(resolveIcon(agent.iconName), { size: 11, color: "white" })
      );
    }

    const label = document.createElement("span");
    label.className = "mention-pill-label";
    label.textContent = agent.name;

    span.appendChild(avatar);
    span.appendChild(label);
    return span;
  }

  // Prefer the live agent (freshest icon/colour/image), falling back to the
  // segment's stored fields.
  function pillAgentFromSegment(seg: {
    agentId: string;
    name: string;
    iconName: string;
    bgColor: string;
  }): PillAgent {
    const live = agentsRef.current.find((a) => a.id === seg.agentId);
    return {
      id: seg.agentId,
      name: live?.name ?? seg.name,
      iconName: live?.iconName ?? seg.iconName,
      bgColor: live?.bgColor ?? seg.bgColor,
      imageUrl: live?.imageUrl,
    };
  }

  function renderInto(el: HTMLDivElement, content: InstructionContent) {
    el.textContent = "";
    content.forEach((seg) => {
      if (seg.type === "text") {
        if (seg.value) el.appendChild(document.createTextNode(seg.value));
      } else {
        el.appendChild(makePill(pillAgentFromSegment(seg)));
      }
    });
  }

  function parse(el: HTMLElement): InstructionContent {
    const segs: InstructionContent = [];
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        segs.push({ type: "text", value: node.textContent ?? "" });
      } else if (node instanceof HTMLElement && node.dataset.agentId) {
        const a = agentsRef.current.find((x) => x.id === node.dataset.agentId);
        if (a)
          segs.push({
            type: "agent",
            agentId: a.id,
            name: a.name,
            iconName: a.iconName,
            bgColor: a.bgColor,
          });
      } else if (node.nodeName === "BR") {
        segs.push({ type: "text", value: "\n" });
      } else {
        segs.push({ type: "text", value: node.textContent ?? "" });
      }
    });
    // Merge adjacent text segments so the model is tidy.
    const merged: InstructionContent = [];
    for (const s of segs) {
      const prev = merged[merged.length - 1];
      if (s.type === "text" && prev && prev.type === "text") prev.value += s.value;
      else merged.push({ ...s });
    }
    return merged.length ? merged : [{ type: "text", value: "" }];
  }

  function emit() {
    const el = editorRef.current;
    if (!el) return;
    const content = parse(el);
    lastEmitted.current = serialize(content);
    onChange(content);
  }

  // Render DOM only when the value changes from OUTSIDE (e.g. AI draft fills it),
  // never on our own edits — so the caret is preserved while typing.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (serialize(value) === lastEmitted.current) return;
    renderInto(el, value);
    lastEmitted.current = serialize(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function closeMenu() {
    mention.current = null;
    setOpened(false);
    setQuery("");
  }

  function detectMention() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return closeMenu();
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return closeMenu();
    const text = node.textContent ?? "";
    const caret = range.startOffset;
    const before = text.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at === -1) return closeMenu();
    const prevChar = before[at - 1];
    if (at > 0 && prevChar && !/\s/.test(prevChar)) return closeMenu();
    const q = before.slice(at + 1);
    if (q.includes("\n")) return closeMenu();
    mention.current = { node: node as Text, at, end: caret };
    setQuery(q);
    setOpened(true);
  }

  function onInput() {
    emit();
    detectMention();
  }

  function pick(agent: Agent) {
    const m = mention.current;
    const el = editorRef.current;
    if (!m || !el || !m.node.parentNode) return closeMenu();
    const full = m.node.textContent ?? "";
    const before = full.slice(0, m.at);
    const after = full.slice(m.end);
    const parent = m.node.parentNode;
    const pill = makePill({
      id: agent.id,
      name: agent.name,
      iconName: agent.iconName,
      bgColor: agent.bgColor,
      imageUrl: agent.imageUrl,
    });
    const afterText = after.startsWith(" ") ? after : " " + after;
    const afterNode = document.createTextNode(afterText);
    if (before) parent.insertBefore(document.createTextNode(before), m.node);
    parent.insertBefore(pill, m.node);
    parent.insertBefore(afterNode, m.node);
    parent.removeChild(m.node);
    // Caret just after the pill (past the leading space).
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(afterNode, 1);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
    closeMenu();
    el.focus();
    emit();
  }

  const filtered = query
    ? agents.filter((a) =>
        a.name.toLowerCase().includes(query.toLowerCase())
      )
    : agents;

  return (
    <Popover
      opened={opened && filtered.length > 0}
      onChange={(o) => !o && closeMenu()}
      position="bottom-start"
      withinPortal
      trapFocus={false}
      shadow="md"
      width={260}
    >
      <Popover.Target>
        <Box
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder}
          className="mention-field"
          onInput={onInput}
          onKeyDown={(e) => {
            if (opened && e.key === "Escape") {
              e.preventDefault();
              closeMenu();
            }
          }}
          onBlur={emit}
        />
      </Popover.Target>
      <Popover.Dropdown p={4}>
        {filtered.map((a) => (
          <UnstyledButton
            key={a.id}
            // mousedown (not click) so the editor keeps focus + selection.
            onMouseDown={(e) => {
              e.preventDefault();
              pick(a);
            }}
            display="block"
            w="100%"
            p="xs"
            style={{ borderRadius: 6 }}
          >
            <Group gap="sm" wrap="nowrap">
              <AgentAvatar iconName={a.iconName} bgColor={a.bgColor} size={20} />
              <Text size="sm">{a.name}</Text>
            </Group>
          </UnstyledButton>
        ))}
      </Popover.Dropdown>
    </Popover>
  );
}
