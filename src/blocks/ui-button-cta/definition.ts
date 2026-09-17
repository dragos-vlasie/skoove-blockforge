import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const uiButtonCtaBlock = {
  type: BlockType.UI_BUTTON_CTA,
  label: "Button CTA",
  shortLabel: "B",
  category: "Shared UI",
  order: 73,
  defaultContent: {
    eyebrow: "Next step",
    title: "Ready to start?",
    body: "Use this compact CTA when a full banner is too much.",
    primaryText: "Get started",
    primaryHref: "#",
    secondaryText: "Learn more",
    secondaryHref: "#",
  },
  schema: z
    .object({
      eyebrow: optionalString,
      title: z.string(),
      body: optionalString,
      primaryText: optionalString,
      primaryHref: optionalString,
      secondaryText: optionalString,
      secondaryHref: optionalString,
    })
    .passthrough(),
  fields: [
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "body", label: "Body", type: "textarea", rows: 4 },
    { id: "primaryText", label: "Primary Button Text", type: "text" },
    { id: "primaryHref", label: "Primary Button Link", type: "url" },
    { id: "secondaryText", label: "Secondary Button Text", type: "text" },
    { id: "secondaryHref", label: "Secondary Button Link", type: "url" },
  ],
} satisfies BlockDefinition;

export default uiButtonCtaBlock;
