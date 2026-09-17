import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

export const vietContactCtaBlock = {
  type: BlockType.TRAVEL_CONTACT_CTA, label: "Contact CTA", shortLabel: "CC", category: "Travel Agency", order: 105,
  defaultContent: { eyebrow: "Need a personal recommendation?", title: "Let us help you choose the right journey", body: "Share your dates, budget, and preferred travel style. Our travel team will recommend a suitable itinerary.", primaryLabel: "Send an enquiry", primaryHref: "/contact/", secondaryLabel: "Call an adviser", secondaryHref: "tel:+10000000000", backgroundImage: "", backgroundImageAlt: "Scenic travel destination" },
  schema: z.object({ eyebrow: optionalString, title: z.string(), body: optionalString, primaryLabel: optionalString, primaryHref: optionalString, secondaryLabel: optionalString, secondaryHref: optionalString, backgroundImage: optionalString, backgroundImageAlt: optionalString }).passthrough(),
  fields: [{ id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "body", label: "Body", type: "textarea", rows: 4 }, { id: "primaryLabel", label: "Primary Label", type: "text" }, { id: "primaryHref", label: "Primary Link", type: "url" }, { id: "secondaryLabel", label: "Secondary Label", type: "text" }, { id: "secondaryHref", label: "Secondary Link", type: "url" }, { id: "backgroundImage", label: "Background Image", type: "image" }, { id: "backgroundImageAlt", label: "Background Image Alt", type: "text" }],
} satisfies BlockDefinition;
export default vietContactCtaBlock;
