"use client";

import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * Theme distilled from migration-instructions/DESIGN-temp.md (the "MiniMax"
 * design language): DM Sans everywhere, a near-black primary anchor, pill-shaped
 * buttons/badges, reserved brand-color accents (coral / magenta / blue / purple),
 * and a tight radius + spacing scale. Tokens propagate through every Mantine
 * component, so screens inherit the look without per-component restyling.
 */

// Near-black "ink" anchor — the brand's dominant CTA + text color. Shade 9 = #0a0a0a.
const ink: MantineColorsTuple = [
  "#f5f6f7",
  "#e6e7e9",
  "#caccd0",
  "#abaeb4",
  "#8f9299",
  "#6f727a",
  "#45515e",
  "#222222",
  "#101418",
  "#0a0a0a",
];

// Reserved product-identity accents. Shade 6 = the brand value (filled-variant default).
const coral: MantineColorsTuple = [
  "#fff0ec", "#ffe0d8", "#ffc0b0", "#ff9d85", "#ff7e5e",
  "#ff6943", "#ff5530", "#e63d1a", "#bd2f12", "#97260d",
];
const magenta: MantineColorsTuple = [
  "#fdeef8", "#f8daee", "#f0b3dc", "#e889ca", "#e166bb",
  "#dd51b2", "#ea5ec1", "#c33b97", "#9d2f79", "#79235d",
];
const brandBlue: MantineColorsTuple = [
  "#e9f0ff", "#cfdcff", "#9cb6ff", "#648dff", "#3669f6",
  "#1d56f2", "#1456f0", "#0e44cf", "#0c39a8", "#0a2f86",
];
const purple: MantineColorsTuple = [
  "#f9f0ff", "#eedcff", "#dab6ff", "#c68bff", "#b566f7",
  "#ad52f7", "#a855f7", "#8c34db", "#7029b0", "#561f88",
];

export const theme = createTheme({
  primaryColor: "ink",
  primaryShade: 9,
  defaultRadius: "md", // 8px — inputs, secondary buttons, search pill

  colors: { ink, coral, magenta, "brand-blue": brandBlue, purple },

  // IBM Plex Sans across every surface; system sans as fallback.
  fontFamily:
    "var(--font-plex-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontFamilyMonospace:
    "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",

  // 16px is the base reading size. The scale leans on weight, not size alone,
  // for hierarchy.
  fontSizes: {
    xs: "12px", // micro / chips
    sm: "14px", // secondary text, descriptions
    md: "16px", // base body + reading text
    lg: "18px", // subtitle / lead
    xl: "20px", // card-title
  },
  // Comfortable 1.5–1.6 leading for body copy (Plex Sans reads well loose).
  lineHeights: {
    xs: "1.5",
    sm: "1.55",
    md: "1.6",
    lg: "1.55",
    xl: "1.45",
  },

  // Radius scale: xs4 sm6 md8 lg12 xl16.
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },

  // Spacing on a 4px base. lg/xl are relaxed a notch so the main content
  // breathes — most page-level Stacks use these, while the dense sidebar stays
  // on xs/sm.
  spacing: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },

  headings: {
    fontFamily:
      "var(--font-plex-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "600",
    // Large headings get tighter 1.2–1.3 leading; tracking is nudged negative
    // in globals.css since Plex Sans reads loose at display sizes.
    sizes: {
      h1: { fontSize: "40px", lineHeight: "1.2", fontWeight: "600" }, // heading-lg
      h2: { fontSize: "32px", lineHeight: "1.22", fontWeight: "600" }, // heading-md
      h3: { fontSize: "24px", lineHeight: "1.25", fontWeight: "600" }, // heading-sm
      h4: { fontSize: "20px", lineHeight: "1.3", fontWeight: "600" }, // card-title
      h5: { fontSize: "18px", lineHeight: "1.4", fontWeight: "600" }, // subtitle
      h6: { fontSize: "16px", lineHeight: "1.45", fontWeight: "600" },
    },
  },

  components: {
    // Pill-shaped buttons are the brand signature — full radius everywhere.
    Button: {
      defaultProps: { radius: "xl" as const },
      styles: {
        root: { borderRadius: 9999, fontWeight: 600 },
      },
    },
    ActionIcon: {
      defaultProps: { radius: "xl" as const },
    },
    Badge: {
      // Pill badges by default; positive tracking so caps/labels don't cramp.
      defaultProps: { radius: "xl" as const },
      styles: {
        root: { borderRadius: 9999, textTransform: "none" as const },
        label: { letterSpacing: "0.03em" },
      },
    },
    Chip: {
      defaultProps: { radius: "xl" as const },
    },
    // Inputs keep the quieter 8px radius; control text sits at the 16px base.
    Input: {
      defaultProps: { radius: "md" as const },
      styles: { input: { fontSize: "16px" } },
    },
    // Field label = 16px medium, description = 14px (regular).
    InputWrapper: {
      styles: {
        label: {
          fontSize: "16px",
          fontWeight: 500,
          letterSpacing: "0.01em",
          marginBottom: "4px",
        },
        description: { fontSize: "14px", lineHeight: 1.5 },
      },
    },
    Card: {
      defaultProps: { radius: "lg" as const, withBorder: true },
    },
    Paper: {
      defaultProps: { radius: "lg" as const },
    },
    Modal: {
      defaultProps: { radius: "lg" as const },
    },
  },
});
