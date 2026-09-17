import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const uiAccordionBlock = {
  type: BlockType.UI_ACCORDION,
  label: "Accordion",
  shortLabel: "A",
  category: "Shared UI",
  order: 70,
  defaultContent: {
    eyebrow: "Details",
    title: "Common questions",
    items: [
      { title: "What can I edit?", body: "Every title, answer, label, and link is stored in CMS content." },
      { title: "Can this match my theme?", body: "Yes. The component uses shared UI styles and theme tokens." },
    ],
  },
  schema: z
    .object({
      eyebrow: optionalString,
      title: z.string(),
      items: z.array(
        z
          .object({
            title: z.string(),
            body: z.string(),
          })
          .passthrough(),
      ),
    })
    .passthrough(),
  fields: [
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    {
      id: "items",
      label: "Accordion Items",
      type: "repeater",
      addLabel: "Add Item",
      defaultItem: { title: "Question", body: "Answer text." },
      fields: [
        { id: "title", label: "Item Title", type: "text" },
        { id: "body", label: "Item Body", type: "textarea", rows: 4 },
      ],
    },
  ],
} satisfies BlockDefinition;

export default uiAccordionBlock;
