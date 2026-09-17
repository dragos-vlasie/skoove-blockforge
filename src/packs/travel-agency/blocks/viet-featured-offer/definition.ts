import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

const factSchema = z.object({ label: z.string(), value: z.string() }).passthrough();
export const vietFeaturedOfferBlock = {
  type: BlockType.TRAVEL_FEATURED_OFFER, label: "Featured Tour", shortLabel: "FT", category: "Travel Agency", order: 102,
  defaultContent: { eyebrow: "Featured journey", title: "A remarkable itinerary worth discovering", summary: "A carefully selected trip for travellers who want memorable landscapes, culture, and local experiences.", image: "", imageAlt: "Featured travel destination", priceLabel: "From", price: "1,499", oldPrice: "1,699", facts: [{ label: "Duration", value: "7 days / 6 nights" }, { label: "Departures", value: "Monthly" }], ctaLabel: "View journey", ctaHref: "/tours/" },
  schema: z.object({ eyebrow: optionalString, title: z.string(), summary: optionalString, image: optionalString, imageAlt: optionalString, priceLabel: optionalString, price: optionalString, oldPrice: optionalString, facts: z.array(factSchema).optional(), ctaLabel: optionalString, ctaHref: optionalString }).passthrough(),
  fields: [
    { id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "summary", label: "Summary", type: "textarea", rows: 4 }, { id: "image", label: "Image", type: "image" }, { id: "imageAlt", label: "Image Alt", type: "text" }, { id: "priceLabel", label: "Price Label", type: "text" }, { id: "price", label: "Price", type: "text" }, { id: "oldPrice", label: "Original Price", type: "text" },
    { id: "facts", label: "Quick Facts", type: "repeater", addLabel: "Add Fact", defaultItem: { label: "Label", value: "Value" }, fields: [{ id: "label", label: "Label", type: "text" }, { id: "value", label: "Value", type: "text" }] },
    { id: "ctaLabel", label: "CTA Label", type: "text" }, { id: "ctaHref", label: "CTA Link", type: "url" },
  ],
} satisfies BlockDefinition;
export default vietFeaturedOfferBlock;
