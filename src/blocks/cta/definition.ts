import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const ctaBlock = {
  type: BlockType.CTA,
  label: "CTA",
  shortLabel: "C",
  category: "Marketing",
  order: 50,
  defaultContent: {
    presentation: "theme",
    eyebrow: "Next step",
    title: "Ready to forge?",
    subtitle: "Launch a static site from structured content.",
    buttonText: "Start Now",
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "panel", "full-width", "minimal"]).default("theme"),
      eyebrow: optionalString,
      title: z.string(),
      subtitle: optionalString,
      buttonText: optionalString,
      href: optionalString,
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      helpText: "Theme default uses the conversion treatment designed for this website.",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Panel", value: "panel" },
        { label: "Full width", value: "full-width" },
        { label: "Minimal", value: "minimal" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "subtitle", label: "Subtitle", type: "textarea", rows: 4 },
    { id: "buttonText", label: "Button Text", type: "text" },
    { id: "href", label: "Button Link", type: "url" },
  ],
  compositionRole: "both",
  presets: [
    {
      id: "theme-default",
      name: "Theme call to action",
      description: "Use the conversion treatment recommended by the active theme.",
      recommended: true,
      content: { presentation: "theme" },
    },
    {
      id: "panel",
      name: "CTA panel",
      description: "A contained call to action with clear visual separation.",
      content: { presentation: "panel" },
    },
    {
      id: "full-width",
      name: "Full-width CTA",
      description: "A high-emphasis call to action spanning the content width.",
      content: { presentation: "full-width" },
    },
    {
      id: "minimal",
      name: "Minimal CTA",
      description: "A quieter prompt suitable inside a mixed composition.",
      content: { presentation: "minimal" },
    },
  ],
} satisfies BlockDefinition;

export default ctaBlock;
