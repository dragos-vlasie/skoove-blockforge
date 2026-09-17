import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const featureBentoBlock = {
  type: BlockType.FEATURE_BENTO,
  label: "Feature Bento",
  shortLabel: "B",
  category: "Marketing",
  order: 36,
  defaultContent: {
    eyebrow: "One flexible platform",
    title: "Everything your team needs to move faster",
    subtitle: "Combine a beautiful website with the operational tools behind it.",
    items: [
      { title: "Visual editing", description: "Create polished pages from reusable sections." },
      { title: "Structured content", description: "Keep copy, media, SEO, and navigation safe." },
      { title: "Static performance", description: "Publish fast public pages with no CMS runtime." },
      { title: "Reusable systems", description: "Share blocks, templates, and starters across clients." },
    ],
  },
  schema: z
    .object({
      eyebrow: optionalString,
      title: z.string(),
      subtitle: optionalString,
      items: z.array(z.object({ title: z.string(), description: z.string() }).passthrough()),
    })
    .passthrough(),
  fields: [
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "subtitle", label: "Subtitle", type: "textarea", rows: 3 },
    {
      id: "items",
      label: "Feature Cards",
      type: "repeater",
      addLabel: "Add Feature",
      defaultItem: { title: "Feature", description: "Describe the feature." },
      fields: [
        { id: "title", label: "Title", type: "text" },
        { id: "description", label: "Description", type: "textarea", rows: 3 },
      ],
    },
  ],
} satisfies BlockDefinition;

export default featureBentoBlock;
