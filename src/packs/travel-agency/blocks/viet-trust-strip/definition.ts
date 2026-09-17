import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

const itemSchema = z.object({ value: optionalString, title: z.string(), description: optionalString }).passthrough();
export const vietTrustStripBlock = {
  type: BlockType.TRAVEL_TRUST_STRIP, label: "Trust Strip", shortLabel: "TS", category: "Travel Agency", order: 104,
  defaultContent: { items: [{ value: "10+", title: "Years of experience", description: "A team that knows every itinerary." }, { value: "24/7", title: "Travel support", description: "Help is available when travellers need it." }, { value: "100%", title: "Transparent pricing", description: "Clear information before booking." }, { value: "4.9/5", title: "Traveller rating", description: "Feedback from completed journeys." }] },
  schema: z.object({ items: z.array(itemSchema).optional() }).passthrough(),
  fields: [{ id: "items", label: "Trust Items", type: "repeater", addLabel: "Add Trust Item", defaultItem: { value: "100%", title: "Trust statement", description: "Supporting detail." }, fields: [{ id: "value", label: "Value", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "description", label: "Description", type: "textarea", rows: 2 }] }],
} satisfies BlockDefinition;
export default vietTrustStripBlock;
