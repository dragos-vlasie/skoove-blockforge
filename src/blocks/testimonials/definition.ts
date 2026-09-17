import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const testimonialsBlock = {
  type: BlockType.TESTIMONIALS,
  label: "Testimonials",
  shortLabel: "T",
  category: "Marketing",
  order: 52,
  defaultContent: {
    presentation: "theme",
    eyebrow: "Customer proof",
    title: "Teams trust the system",
    items: [
      { quote: "The site finally feels easy to update without breaking the design.", name: "Mara Lee", role: "Founder", image: "" },
      { quote: "We launched a polished site and kept the content model clean.", name: "Theo Grant", role: "Studio lead" },
      { quote: "The reusable sections made client work much faster.", name: "Iris Chen", role: "Designer" },
    ],
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "cards", "spotlight", "minimal"]).default("theme"),
      eyebrow: optionalString,
      title: z.string(),
      items: z.array(z.object({ quote: z.string(), name: z.string(), role: optionalString, image: optionalString }).passthrough()),
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Testimonial cards", value: "cards" },
        { label: "Spotlight quote", value: "spotlight" },
        { label: "Minimal quotes", value: "minimal" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    {
      id: "items",
      label: "Testimonials",
      type: "repeater",
      addLabel: "Add Testimonial",
      defaultItem: { quote: "Add a useful customer quote.", name: "Customer Name", role: "Role", image: "" },
      fields: [
        { id: "quote", label: "Quote", type: "textarea", rows: 4 },
        { id: "name", label: "Name", type: "text" },
        { id: "role", label: "Role", type: "text" },
        { id: "image", label: "Portrait", type: "image" },
      ],
    },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme testimonials", description: "Customer proof styled by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "cards", name: "Quote cards", description: "Multiple testimonials with equal visual weight.", content: { presentation: "cards" } },
    { id: "spotlight", name: "Spotlight quote", description: "One prominent quote supported by additional proof.", content: { presentation: "spotlight" } },
    { id: "minimal", name: "Minimal quotes", description: "A restrained proof section with fewer visual containers.", content: { presentation: "minimal" } },
  ],
} satisfies BlockDefinition;

export default testimonialsBlock;
