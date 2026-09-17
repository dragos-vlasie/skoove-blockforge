import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const pricingBlock = {
  type: BlockType.PRICING,
  label: "Pricing",
  shortLabel: "P",
  category: "Marketing",
  order: 54,
  defaultContent: {
    presentation: "theme",
    eyebrow: "Simple pricing",
    title: "Choose the right plan",
    subtitle: "Use this section for packages, retainers, subscriptions, or service tiers.",
    plans: [
      { name: "Starter", price: "$499", description: "A focused launch package.", features: "Landing page, SEO basics, contact flow", buttonText: "Start" },
      { name: "Growth", price: "$1,500", description: "More pages and stronger content.", features: "5 pages, CMS setup, media library", buttonText: "Choose Growth", featured: true },
      { name: "Custom", price: "Let's talk", description: "For larger websites or app workflows.", features: "Custom blocks, integrations, support", buttonText: "Contact us" },
    ],
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "cards", "featured", "compact"]).default("theme"),
      eyebrow: optionalString,
      title: z.string(),
      subtitle: optionalString,
      plans: z.array(
        z
          .object({
            name: z.string(),
            price: z.string(),
            description: optionalString,
            features: optionalString,
            buttonText: optionalString,
            href: optionalString,
            featured: z.boolean().optional(),
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
        { label: "Pricing cards", value: "cards" },
        { label: "Featured plan", value: "featured" },
        { label: "Compact comparison", value: "compact" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "subtitle", label: "Subtitle", type: "textarea", rows: 3 },
    {
      id: "plans",
      label: "Plans",
      type: "repeater",
      addLabel: "Add Plan",
      defaultItem: { name: "Plan", price: "$0", description: "Describe the plan.", features: "Feature one, Feature two", buttonText: "Choose plan", featured: false },
      fields: [
        { id: "name", label: "Name", type: "text" },
        { id: "price", label: "Price", type: "text" },
        { id: "description", label: "Description", type: "textarea", rows: 3 },
        { id: "features", label: "Features", type: "textarea", rows: 3 },
        { id: "buttonText", label: "Button Text", type: "text" },
        { id: "href", label: "Button Link", type: "url" },
        { id: "featured", label: "Featured Plan", type: "boolean" },
      ],
    },
  ],
  compositionRole: "section",
  presets: [
    { id: "theme-default", name: "Theme pricing", description: "Pricing styled by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "cards", name: "Pricing cards", description: "Equal packages with straightforward comparison.", content: { presentation: "cards" } },
    { id: "featured", name: "Featured package", description: "Emphasise one preferred package or service.", content: { presentation: "featured" } },
    { id: "compact", name: "Compact pricing", description: "Reduced-height pricing for shorter pages.", content: { presentation: "compact" } },
  ],
} satisfies BlockDefinition;

export default pricingBlock;
