"use client";

import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ActionIcon,
  Box,
  Group,
  Paper,
  Popover,
  ScrollArea,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconPaperclip,
  IconArrowUp,
  IconTools,
  IconAt,
} from "@tabler/icons-react";
import { useStore } from "@/lib/store";
import { AgentAvatar } from "@/components/common/AgentAvatar";
import { resolveIcon } from "@/components/common/iconMap";

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Shows the (cosmetic) tools button on the left of the composer. */
  showTools?: boolean;
}

interface PillAgent {
  id: string;
  name: string;
  iconName: string;
  bgColor: string;
  imageUrl?: string;
}

/**
 * Shared chat composer. Used on the home/welcome screen and in the chat view.
 *
 * Supports @mentions: typing "@" (or clicking the @ button) opens a searchable
 * agent picker; the chosen agent renders as an inline pill. The composer's
 * public value stays a plain string — pills serialize to "@AgentName" so the
 * mention is passed to the LLM as a tagged reference (no routing).
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask me anything…",
  disabled = false,
  autoFocus = false,
  showTools = true,
}: ComposerProps) {
  const agents = useStore((s) => s.agents);
  const assistants = useStore((s) => s.assistants);

  // Everything mentionable: created/saved agents + the marketplace catalog,
  // deduped by id and sorted alphabetically (matches the scheduled field).
  const mentionable = useMemo<PillAgent[]>(() => {
    const map = new Map<string, PillAgent>();
    const add = (a: PillAgent) => {
      if (!map.has(a.id)) map.set(a.id, a);
    };
    agents.forEach((a) =>
      add({
        id: a.id,
        name: a.name,
        iconName: a.iconName,
        bgColor: a.bgColor,
        imageUrl: a.imageUrl,
      })
    );
    assistants.forEach((a) =>
      add({
        id: a.id,
        name: a.name,
        iconName: a.iconName,
        bgColor: a.bgColor,
        imageUrl: a.imageUrl,
      })
    );
    return [...map.values()].sort((x, y) => x.name.localeCompare(y.name));
  }, [agents, assistants]);

  // Names longest-first so "@Email Reply Drafter" wins over a shorter prefix
  // when re-rendering a plain-text value back into pills.
  const byName = useMemo(() => {
    const m = new Map<string, PillAgent>();
    mentionable.forEach((a) => m.set(a.name, a));
    return m;
  }, [mentionable]);
  const namesByLen = useMemo(
    () => mentionable.map((a) => a.name).sort((a, b) => b.length - a.length),
    [mentionable]
  );

  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  // Pending "@query" location while the picker is open (type-trigger only).
  const mention = useRef<{ node: Text; at: number; end: number } | null>(null);
  // Caret snapshot taken when the @ button steals focus (button-trigger only).
  const savedRange = useRef<Range | null>(null);

  const [opened, setOpened] = useState(false);
  const [triggerMode, setTriggerMode] = useState<"type" | "button">("type");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // ---- pill DOM ------------------------------------------------------------
  function makePill(agent: PillAgent): HTMLElement {
    const span = document.createElement("span");
    span.contentEditable = "false";
    span.dataset.agentId = agent.id;
    span.dataset.agentName = agent.name;
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

  // ---- serialize: DOM -> plain text with "@AgentName" ----------------------
  function serialize(el: HTMLElement): string {
    let out = "";
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent ?? "";
      } else if (node instanceof HTMLElement && node.dataset.agentName) {
        out += "@" + node.dataset.agentName;
      } else if (node.nodeName === "BR") {
        out += "\n";
      } else {
        out += node.textContent ?? "";
      }
    });
    return out;
  }

  // ---- render: plain text with "@AgentName" -> DOM (pills) -----------------
  function renderFromText(el: HTMLDivElement, text: string) {
    el.textContent = "";
    const frag = document.createDocumentFragment();
    let buffer = "";
    const flush = () => {
      if (buffer) {
        frag.appendChild(document.createTextNode(buffer));
        buffer = "";
      }
    };
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === "@" && (i === 0 || /\s/.test(text[i - 1]))) {
        const rest = text.slice(i + 1);
        const match = namesByLen.find((n) => rest.startsWith(n));
        const agent = match ? byName.get(match) : undefined;
        if (match && agent) {
          flush();
          frag.appendChild(makePill(agent));
          i += 1 + match.length;
          continue;
        }
      }
      if (ch === "\n") {
        flush();
        frag.appendChild(document.createElement("br"));
        i += 1;
        continue;
      }
      buffer += ch;
      i += 1;
    }
    flush();
    el.appendChild(frag);
  }

  function emit() {
    const el = editorRef.current;
    if (!el) return;
    const text = serialize(el);
    lastEmitted.current = text;
    onChange(text);
  }

  // Focus the editable surface on mount when requested (contenteditable has no
  // native autoFocus).
  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render only when the value changes from OUTSIDE (suggestion buttons,
  // reset-on-send), never on our own edits — so the caret is preserved.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === lastEmitted.current) return;
    renderFromText(el, value);
    lastEmitted.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ---- picker open/close ---------------------------------------------------
  function closeMenu() {
    mention.current = null;
    savedRange.current = null;
    setOpened(false);
    setQuery("");
    setActiveIndex(0);
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
    setActiveIndex(0);
    setOpened(true);
  }

  function onInput() {
    emit();
    detectMention();
  }

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
    setActiveIndex(0);
    setOpened(true);
  }

  // ---- insert a chosen agent ----------------------------------------------
  function placeCaretAfter(node: Node) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function pick(agent: PillAgent) {
    const el = editorRef.current;
    if (!el) return closeMenu();
    el.focus();
    const pill = makePill(agent);

    if (triggerMode === "type" && mention.current && mention.current.node.parentNode) {
      // Replace the typed "@query" with the pill.
      const m = mention.current;
      const parent = m.node.parentNode;
      if (!parent) return closeMenu();
      const full = m.node.textContent ?? "";
      const before = full.slice(0, m.at);
      const after = full.slice(m.end);
      const afterText = after.startsWith(" ") ? after : " " + after;
      const afterNode = document.createTextNode(afterText);
      if (before) parent.insertBefore(document.createTextNode(before), m.node);
      parent.insertBefore(pill, m.node);
      parent.insertBefore(afterNode, m.node);
      parent.removeChild(m.node);
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
      const space = document.createTextNode(" ");
      range.insertNode(space);
      range.insertNode(pill);
      sel?.removeAllRanges();
      placeCaretAfter(space);
    }

    closeMenu();
    emit();
  }

  // ---- filtered list + keyboard nav ---------------------------------------
  const filtered = query
    ? mentionable.filter((a) =>
        a.name.toLowerCase().includes(query.toLowerCase())
      )
    : mentionable;
  const showPicker = opened && filtered.length > 0;

  function onListKeyDown(e: React.KeyboardEvent) {
    if (!showPicker) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      return true;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pick(filtered[Math.min(activeIndex, filtered.length - 1)]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return true;
    }
    return false;
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  function onFieldKeyDown(e: React.KeyboardEvent) {
    // Let the picker consume navigation keys first.
    if (onListKeyDown(e)) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <Paper withBorder radius="lg" p="sm" shadow="xs">
      <Popover
        opened={showPicker}
        onChange={(o) => !o && closeMenu()}
        position="bottom-start"
        withinPortal
        trapFocus={triggerMode === "button"}
        shadow="md"
        width={280}
      >
        <Popover.Target>
          <Box
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            data-placeholder={placeholder}
            className="composer-field"
            data-autofocus={autoFocus || undefined}
            onInput={onInput}
            onKeyDown={onFieldKeyDown}
            onBlur={emit}
          />
        </Popover.Target>
        <Popover.Dropdown p={4}>
          {triggerMode === "button" && (
            <TextInput
              data-autofocus
              size="xs"
              mb={4}
              placeholder="Search agents…"
              value={query}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setActiveIndex(0);
              }}
              onKeyDown={onListKeyDown}
              leftSection={<IconAt size={14} />}
            />
          )}
          <ScrollArea.Autosize mah={240} type="auto">
            {filtered.map((a, idx) => (
              <UnstyledButton
                key={a.id}
                // mousedown (not click) so the editor keeps focus + selection.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(a);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                display="block"
                w="100%"
                p="xs"
                style={{
                  borderRadius: 6,
                  background:
                    idx === activeIndex
                      ? "var(--mantine-color-gray-1)"
                      : undefined,
                }}
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

      <Group justify="space-between" mt="xs" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Attach (mock)">
            <ActionIcon variant="subtle" color="gray" aria-label="Attach">
              <IconPaperclip size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Mention an agent">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Mention an agent"
              disabled={disabled}
              onMouseDown={(e) => {
                // Preserve the field's caret/selection before focus shifts.
                e.preventDefault();
                openFromButton();
              }}
            >
              <IconAt size={18} />
            </ActionIcon>
          </Tooltip>
          {showTools && (
            <Tooltip label="Tools (mock)">
              <ActionIcon variant="subtle" color="gray" aria-label="Tools">
                <IconTools size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <ActionIcon
          variant="filled"
          radius="xl"
          size="lg"
          aria-label="Send"
          disabled={disabled || value.trim().length === 0}
          onClick={submit}
        >
          <IconArrowUp size={18} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
