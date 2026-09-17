import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const featuresBlock = {
  type: BlockType.FEATURES,
  label: "Features",
  shortLabel: "F",
  category: "Marketing",
  order: 30,
  defaultContent: {
    presentation: "theme",
    eyebrow: "Why choose us",
    title: "Our Features",
    items: [
      { title: "Deterministic", description: "What you see is what you get, every time." },
      { title: "JSON Storage", description: "Clean data, no messy HTML strings." },
    ],
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "numbered", "cards", "minimal"]).default("theme"),
      eyebrow: optionalString,
      title: optionalString,
      items: z.array(
        z
          .object({
            title: z.string(),
            description: z.string(),
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
      helpText: "Theme default uses the presentation designed for the active website theme.",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Numbered", value: "numbered" },
        { label: "Cards", value: "cards" },
        { label: "Minimal", value: "minimal" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    {
      id: "items",
      label: "Features",
      type: "repeater",
      addLabel: "Add Feature",
      defaultItem: { title: "Feature", description: "Describe the feature." },
      fields: [
        { id: "title", label: "Feature Title", type: "text", placeholder: "Feature title" },
        {
          id: "description",
          label: "Feature Description",
          type: "textarea",
          placeholder: "Feature description",
          rows: 3,
        },
      ],
    },
  ],
  compositionRole: "both",
  presets: [
    {
      id: "theme-default",
      name: "Theme features",
      description: "Use the feature treatment recommended by the active theme.",
      recommended: true,
      content: { presentation: "theme" },
    },
    {
      id: "numbered",
      name: "Numbered features",
      description: "A clear sequential presentation for processes or principles.",
      content: { presentation: "numbered" },
    },
    {
      id: "cards",
      name: "Feature cards",
      description: "Contained cards suited to benefits, services, or capabilities.",
      content: { presentation: "cards" },
    },
    {
      id: "minimal",
      name: "Minimal features",
      description: "A quiet presentation with reduced decoration.",
      content: { presentation: "minimal" },
    },
  ],
} satisfies BlockDefinition;

export default featuresBlock;
