import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

export const vietSectionHeadingBlock = {
  type: BlockType.TRAVEL_SECTION_HEADING, label: "Section Heading", shortLabel: "SH", category: "Travel Agency", order: 101,
  defaultContent: { eyebrow: "Selected by our travel team", title: "Choose a journey that suits you", body: "Each itinerary balances discovery, time to unwind, and memorable local experiences.", align: "left" },
  schema: z.object({ eyebrow: optionalString, title: z.string(), body: optionalString, align: z.enum(["left", "center"]).optional(), headingLevel: z.enum(["h1", "h2"]).optional() }).passthrough(),
  fields: [{ id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "body", label: "Body", type: "textarea", rows: 4 }, { id: "align", label: "Alignment (left or center)", type: "text" }, { id: "headingLevel", label: "Heading level (h1 or h2)", type: "text" }],
} satisfies BlockDefinition;
export default vietSectionHeadingBlock;
