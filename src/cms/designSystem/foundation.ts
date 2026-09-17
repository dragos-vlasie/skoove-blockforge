import type { CmsTab } from "../types";
import type { IconName } from "../icons";

/**
 * CMS chrome primitives intentionally use their own neutral/violet palette.
 * Public-site theme variables must not change the authoring interface.
 */
export const cmsTokens = {
  color: {
    accent: "#6d5dfc",
    accentHover: "#5b4bea",
    accentSoft: "#f2efff",
    accentBorder: "#d7ceff",
    canvas: "#f8fafc",
    surface: "#ffffff",
    text: "#172033",
    muted: "#667085",
    subtle: "#98a2b3",
    border: "#e4e7ec",
  },
  radius: {
    control: "0.5rem",
    panel: "0.75rem",
    overlay: "1rem",
  },
} as const;

export const cmsFocusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#6d5dfc] focus-visible:ring-offset-2";

export const cmsControlBase =
  `inline-flex min-h-11 items-center justify-center rounded-lg font-bold transition ${cmsFocusRing} disabled:pointer-events-none disabled:opacity-40`;

export const cmsNavigationItems: ReadonlyArray<{
  id: CmsTab;
  label: string;
  description: string;
  icon: IconName;
  testId: string;
}> = [
  {
    id: "editor",
    label: "Editor",
    description: "Visual page editing",
    icon: "editor",
    testId: "rail-editor",
  },
  {
    id: "content",
    label: "Content",
    description: "Pages and site content",
    icon: "content",
    testId: "rail-content",
  },
  {
    id: "media",
    label: "Media",
    description: "Images and files",
    icon: "image",
    testId: "rail-media",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Traffic and engagement",
    icon: "chart",
    testId: "rail-analytics",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Workspace setup",
    icon: "settings",
    testId: "rail-settings",
  },
] as const;
