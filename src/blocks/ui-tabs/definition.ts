import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const uiTabsBlock = {
  type: BlockType.UI_TABS,
  label: "Tabs",
  shortLabel: "T",
  category: "Shared UI",
  order: 71,
  defaultContent: {
    eyebrow: "Options",
    title: "Organize content into tabs",
    tabs: [
      { label: "Overview", title: "Simple structure", body: "Tabs keep related content compact without hiding the editing model." },
      { label: "Details", title: "Editable content", body: "Each label, heading, and body is controlled by CMS fields." },
    ],
  },
  schema: z
    .object({
      eyebrow: optionalString,
      title: z.string(),
      tabs: z.array(
        z
          .object({
            label: z.string(),
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
      id: "tabs",
      label: "Tabs",
      type: "repeater",
      addLabel: "Add Tab",
      defaultItem: { label: "Tab", title: "Tab title", body: "Tab content." },
      fields: [
        { id: "label", label: "Tab Label", type: "text" },
        { id: "title", label: "Tab Title", type: "text" },
        { id: "body", label: "Tab Body", type: "textarea", rows: 4 },
      ],
    },
  ],
} satisfies BlockDefinition;

export default uiTabsBlock;
