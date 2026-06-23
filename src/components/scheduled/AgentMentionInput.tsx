"use client";

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ActionIcon,
  Box,
  Group,
  Popover,
  ScrollArea,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconAt } from "@tabler/icons-react";
import type { InstructionContent } from "@/types";
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
  placeholder = "Describe the task… type @ to mention an agent",
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
  // Mentions can reference marketplace assistants (e.g. Newsletter, Email Reply
  // Drafter) which aren't in state.agents — resolve those for the pill avatar.
  const assistants = useStore((s) => s.assistants);
  const assistantsRef = useRef(assistants);
  useEffect(() => {
    assistantsRef.current = assistants;
  }, [assistants]);

  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  // The pending "@query" location while the picker is open (type-trigger only).
  const mention = useRef<{ node: Text; at: number; end: number } | null>(null);
  // Caret snapshot taken when the @ button steals focus (button-trigger only).
  const savedRange = useRef<Range | null>(null);

  const [opened, setOpened] = useState(false);
  const [triggerMode, setTriggerMode] = useState<"type" | "button">("type");
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
    const live =
      agentsRef.current.find((a) => a.id === seg.agentId) ??
      assistantsRef.current.find((a) => a.id === seg.agentId);
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
        const id = node.dataset.agentId;
        const a =
          agentsRef.current.find((x) => x.id === id) ??
          assistantsRef.current.find((x) => x.id === id);
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
    savedRange.current = null;
    setOpened(false);
    setQuery("");
  }

  // Open the picker from the @ button (no "@" typed): snapshot the caret so the
  // chosen pill lands where the user was editing.
  function openFromButton() {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el && el.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRange.current = null;
    }
    mention.current = null;
    setTriggerMode("button");
    setQuery("");
    setOpened(true);
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
    setTriggerMode("type");
    setQuery(q);
    setOpened(true);
  }

  function onInput() {
    emit();
    detectMention();
  }

  function pick(agent: PillAgent) {
    const el = editorRef.current;
    if (!el) return closeMenu();
    el.focus();
    const pill = makePill(agent);
    const m = mention.current;

    if (triggerMode === "type" && m && m.node.parentNode) {
      // Replace the typed "@query" with the pill.
      const parent = m.node.parentNode;
      const full = m.node.textContent ?? "";
      const before = full.slice(0, m.at);
      const after = full.slice(m.end);
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
    } else {
      // Button trigger: insert at the saved caret (or append at the end).
      const sel = window.getSelection();
      let range: Range;
      if (savedRange.current) {
        range = savedRange.current;
      } else {
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }
      range.deleteContents();
      const space = document.createTextNode(" ");
      range.insertNode(space);
      range.insertNode(pill);
      const after = document.createRange();
      after.setStartAfter(space);
      after.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(after);
    }

    closeMenu();
    el.focus();
    emit();
  }

  // Everything mentionable: your created agents + saved agents + the full
  // marketplace catalog, deduped by id (owned agents also appear as assistants)
  // and sorted alphabetically.
  const mentionable = useMemo<PillAgent[]>(() => {
    const map = new Map<string, PillAgent>();
    const add = (a: {
      id: string;
      name: string;
      iconName: string;
      bgColor: string;
      imageUrl?: string;
    }) => {
      if (!map.has(a.id))
        map.set(a.id, {
          id: a.id,
          name: a.name,
          iconName: a.iconName,
          bgColor: a.bgColor,
          imageUrl: a.imageUrl,
        });
    };
    agents.forEach(add);
    assistants.forEach(add);
    return [...map.values()].sort((x, y) => x.name.localeCompare(y.name));
  }, [agents, assistants]);

  const filtered = query
    ? mentionable.filter((a) =>
        a.name.toLowerCase().includes(query.toLowerCase())
      )
    : mentionable;

  return (
    <Popover
      opened={opened && filtered.length > 0}
      onChange={(o) => !o && closeMenu()}
      position="bottom-start"
      withinPortal
      trapFocus={triggerMode === "button"}
      shadow="md"
      width={260}
    >
      <Popover.Target>
        <Box pos="relative">
          <Box
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            data-placeholder={placeholder}
            className="mention-field"
            style={{ paddingLeft: 40 }}
            onInput={onInput}
            onKeyDown={(e) => {
              if (opened && e.key === "Escape") {
                e.preventDefault();
                closeMenu();
              }
            }}
            onBlur={emit}
          />
          <Tooltip label="Mention an agent" position="right">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Mention an agent"
              pos="absolute"
              bottom={6}
              left={6}
              onMouseDown={(e) => {
                // Preserve the field's caret/selection before focus shifts.
                e.preventDefault();
                openFromButton();
              }}
            >
              <IconAt size={18} />
            </ActionIcon>
          </Tooltip>
        </Box>
      </Popover.Target>
      <Popover.Dropdown p={4}>
        {triggerMode === "button" && (
          <TextInput
            data-autofocus
            size="xs"
            mb={4}
            placeholder="Search agents…"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeMenu();
              }
            }}
            leftSection={<IconAt size={14} />}
          />
        )}
        <ScrollArea.Autosize mah={240} type="auto">
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
                <AgentAvatar
                  iconName={a.iconName}
                  bgColor={a.bgColor}
                  imageUrl={a.imageUrl}
                  size={20}
                />
                <Text size="sm" lineClamp={1}>
                  {a.name}
                </Text>
              </Group>
            </UnstyledButton>
          ))}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
