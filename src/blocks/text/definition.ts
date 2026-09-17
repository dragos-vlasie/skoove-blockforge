import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, richTextDocSchema, type BlockDefinition } from "../types";

export const textBlock = {
  type: BlockType.TEXT,
  label: "Text",
  shortLabel: "T",
  category: "Content",
  order: 20,
  defaultContent: {
    presentation: "theme",
    title: "",
    nodes: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "New Structured Content" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Start building with deterministic blocks." }],
        },
      ],
    },
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "standard", "lead", "compact"]).default("theme"),
      title: optionalString,
      nodes: richTextDocSchema,
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      helpText: "Theme default follows the website's editorial rhythm.",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Standard", value: "standard" },
        { label: "Lead statement", value: "lead" },
        { label: "Compact", value: "compact" },
      ],
    },
    { id: "title", label: "Title", type: "text" },
    { id: "nodes", label: "Body", type: "richText" },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme text", description: "Editorial content using the active theme's preferred measure and emphasis.", recommended: true, content: { presentation: "theme" } },
    { id: "standard", name: "Standard text", description: "A readable general-purpose text section.", content: { presentation: "standard" } },
    { id: "lead", name: "Lead statement", description: "Larger introductory copy for an important message.", content: { presentation: "lead" } },
    { id: "compact", name: "Compact text", description: "A shorter text section for supporting details.", content: { presentation: "compact" } },
  ],
} satisfies BlockDefinition;

export default textBlock;
