import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const rentalProblemBlock = {
  type: BlockType.RENTAL_PROBLEM,
  label: "Problem",
  shortLabel: "P",
  category: "Rental car",
  order: 22,
  defaultContent: {
    heading: "The Problem We Solve",
    subheading: "Your pain points addressed",
    steps: [
      { emoji: "1", text: "Identify the problem" },
      { emoji: "2", text: "Research the issue" },
      { emoji: "3", text: "Find the solution" },
    ],
  },
  schema: z
    .object({
      heading: z.string(),
      subheading: optionalString,
      steps: z.array(
        z
          .object({
            emoji: optionalString,
            text: z.string(),
          })
          .passthrough(),
      ),
    })
    .passthrough(),
  fields: [
    { id: "heading", label: "Heading", type: "text" },
    { id: "subheading", label: "Subheading", type: "textarea", rows: 3 },
    {
      id: "steps",
      label: "Steps",
      type: "repeater",
      addLabel: "Add Step",
      defaultItem: { emoji: "1", text: "Step text" },
      fields: [
        { id: "emoji", label: "Marker", type: "text" },
        { id: "text", label: "Text", type: "text" },
      ],
    },
  ],
} satisfies BlockDefinition;

export default rentalProblemBlock;
