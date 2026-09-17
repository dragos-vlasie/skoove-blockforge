import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const uiCardGridBlock = {
  type: BlockType.UI_CARD_GRID,
  label: "Card Grid",
  shortLabel: "C",
  category: "Content",
  order: 72,
  defaultContent: {
    presentation: "theme",
    columns: "3",
    eyebrow: "Highlights",
    title: "Reusable cards",
    items: [
      { title: "Fast setup", body: "Use cards for services, features, benefits, or process steps.", image: "", buttonText: "Learn more", href: "#" },
      { title: "Theme ready", body: "The visual shell comes from shared UI tokens.", buttonText: "View details", href: "#" },
      { title: "CMS editable", body: "Card text and links are generated from block fields.", buttonText: "Open", href: "#" },
    ],
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "elevated", "bordered", "minimal"]).default("theme"),
      columns: z.enum(["2", "3", "4"]).default("3"),
      eyebrow: optionalString,
      title: z.string(),
      items: z.array(
        z
          .object({
            title: z.string(),
            body: z.string(),
            image: optionalString,
            buttonText: optionalString,
            href: optionalString,
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
        { label: "Elevated cards", value: "elevated" },
        { label: "Bordered cards", value: "bordered" },
        { label: "Minimal list", value: "minimal" },
      ],
    },
    {
      id: "columns",
      label: "Columns",
      type: "select",
      options: [
        { label: "2 columns", value: "2" },
        { label: "3 columns", value: "3" },
        { label: "4 columns", value: "4" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    {
      id: "items",
      label: "Cards",
      type: "repeater",
      addLabel: "Add Card",
      defaultItem: { title: "Card title", body: "Card body.", image: "", buttonText: "Learn more", href: "#" },
      fields: [
        { id: "title", label: "Card Title", type: "text" },
        { id: "body", label: "Card Body", type: "textarea", rows: 4 },
        { id: "image", label: "Image", type: "image" },
        { id: "buttonText", label: "Button Text", type: "text" },
        { id: "href", label: "Button Link", type: "url" },
      ],
    },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme cards", description: "Cards styled by the active theme.", recommended: true, content: { presentation: "theme", columns: "3" } },
    { id: "services", name: "Service cards", description: "Three clear service or capability cards.", content: { presentation: "bordered", columns: "3" } },
    { id: "visual", name: "Visual cards", description: "Image-led cards for destinations, work, or products.", content: { presentation: "elevated", columns: "3" } },
    { id: "compact", name: "Compact list", description: "A quieter two-column content list.", content: { presentation: "minimal", columns: "2" } },
  ],
} satisfies BlockDefinition;

export default uiCardGridBlock;
