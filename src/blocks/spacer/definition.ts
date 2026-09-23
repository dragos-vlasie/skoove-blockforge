import { z } from "zod";
import { BlockType } from "../../../types";
import { defaultSpacerHeight, spacerHeights } from "../../content/spacer";
import type { BlockDefinition } from "../types";

export const spacerBlock = {
  type: BlockType.SPACER,
  label: "Spacer",
  shortLabel: "↕",
  category: "Layout",
  order: 25,
  compositionRole: "both",
  defaultContent: { height: defaultSpacerHeight },
  schema: z.object({
    height: z.union([z.number(), z.string().regex(/^(4|8|12|16|20)$/)])
      .transform(Number).pipe(z.union([z.literal(4), z.literal(8), z.literal(12), z.literal(16), z.literal(20)]))
      .default(defaultSpacerHeight),
  }).passthrough(),
  fields: [{
    id: "height", label: "Height", type: "select",
    options: spacerHeights.map((height) => ({ label: `${height}px`, value: String(height) })),
    helpText: "Adds this much empty space. Existing section padding is unchanged. Only visible as a guide in the editor.",
  }],
} satisfies BlockDefinition;

export default spacerBlock;
