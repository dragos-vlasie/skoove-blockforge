import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const statsBlock = {
  type: BlockType.STATS,
  label: "Stats",
  shortLabel: "S",
  category: "Marketing",
  order: 60,
  defaultContent: {
    presentation: "theme",
    eyebrow: "Proof in numbers",
    title: "Results at a glance",
    items: [
      { label: "Static Routes", value: "100%" },
      { label: "Client JS", value: "0kb" },
      { label: "Schema Types", value: "6" },
    ],
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "inverse", "cards", "minimal"]).default("theme"),
      eyebrow: optionalString,
      title: optionalString,
      items: z.array(
        z
          .object({
            label: z.string(),
            value: z.string(),
          })
          .passthrough(),
      ),
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Inverse band", value: "inverse" },
        { label: "Metric cards", value: "cards" },
        { label: "Minimal", value: "minimal" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    {
      id: "items",
      label: "Stats",
      type: "repeater",
      addLabel: "Add Stat",
      defaultItem: { label: "Metric", value: "100%" },
      fields: [
        { id: "value", label: "Value", type: "text", placeholder: "Value" },
        { id: "label", label: "Label", type: "text", placeholder: "Label" },
      ],
    },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme statistics", description: "Metrics presented using the active theme's preferred treatment.", recommended: true, content: { presentation: "theme" } },
    { id: "inverse", name: "Inverse band", description: "High-contrast metrics spanning the section.", content: { presentation: "inverse" } },
    { id: "cards", name: "Metric cards", description: "Contained values that work well among other content.", content: { presentation: "cards" } },
    { id: "minimal", name: "Minimal statistics", description: "Quiet metrics separated by simple rules.", content: { presentation: "minimal" } },
  ],
} satisfies BlockDefinition;

export default statsBlock;
