import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const faqBlock = {
  type: BlockType.FAQ,
  label: "FAQ",
  shortLabel: "Q",
  category: "Marketing",
  order: 40,
  defaultContent: {
    presentation: "theme",
    tagLine: "FAQ",
    headline: "FREQUENTLY ASKED QUESTIONS",
    items: [
      {
        question: "What's your insurance policy?",
        answer:
          "The car has insurance in case you have an accident with another car or person. The insurance does not cover negligence, like driving with alcohol, driving the wrong way, or damaging the car against a wall.",
      },
      {
        question: "How can I rent a car with you?",
        answer: "You can use our website, call us, or come to our office in Rua 31 de Janeiro, Funchal, Madeira.",
      },
    ],
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "split", "stacked", "minimal"]).default("theme"),
      tagLine: optionalString,
      tag_line: optionalString,
      headline: z.string(),
      items: z
        .array(
          z
            .object({
              question: z.string(),
              answer: z.string(),
            })
            .passthrough(),
        )
        .optional(),
      faq_list: z
        .array(
          z
            .object({
              question: z.string(),
              answer: z.string(),
            })
            .passthrough(),
        )
        .optional(),
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      helpText: "Theme default follows the active website design.",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Split heading and questions", value: "split" },
        { label: "Stacked", value: "stacked" },
        { label: "Minimal", value: "minimal" },
      ],
    },
    { id: "tagLine", label: "Tag Line", type: "text" },
    { id: "headline", label: "Headline", type: "text" },
    {
      id: "items",
      label: "FAQ Items",
      type: "repeater",
      addLabel: "Add FAQ",
      defaultItem: { question: "Question?", answer: "Answer." },
      fields: [
        { id: "question", label: "Question", type: "text" },
        { id: "answer", label: "Answer", type: "textarea", rows: 4 },
      ],
    },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme FAQ", description: "The FAQ layout recommended by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "split", name: "Split FAQ", description: "Introduction beside an accordion list.", content: { presentation: "split" } },
    { id: "stacked", name: "Stacked FAQ", description: "A readable single-column question list.", content: { presentation: "stacked" } },
    { id: "minimal", name: "Minimal FAQ", description: "Reduced decoration for content-heavy pages.", content: { presentation: "minimal" } },
  ],
} satisfies BlockDefinition;

export default faqBlock;
