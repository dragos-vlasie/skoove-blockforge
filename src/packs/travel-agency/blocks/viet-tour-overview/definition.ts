import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

const factSchema = z.object({ label: z.string(), value: z.string() }).passthrough();
export const vietTourOverviewBlock = {
  type: BlockType.TRAVEL_TOUR_OVERVIEW, label: "Tour Overview", shortLabel: "TO", category: "Travel Agency", order: 107,
  defaultContent: { eyebrow: "Selected journey", title: "Tour name", summary: "Introduce the character of the journey and its most memorable experiences.", image: "", imageAlt: "Featured tour destination", priceLabel: "From", price: "Contact us", facts: [{ label: "Duration", value: "7 days / 6 nights" }, { label: "Transport", value: "Flight" }, { label: "Departure", value: "Main airport" }, { label: "Travel style", value: "Discovery" }], primaryLabel: "Plan this trip", primaryHref: "#travel-enquiry", backLabel: "All tours", backHref: "/tours/" },
  previewContent: {
    eyebrow: "Culture & landscapes",
    title: "Japan: Tokyo, Kyoto & the Alps",
    summary: "Move from Tokyo's electric neighbourhoods to Kyoto's quiet temples, with alpine villages and mountain scenery in between.",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=82&w=1600",
    imageAlt: "Traditional Japanese pagoda framed by autumn trees",
    price: "$2,490",
    facts: [{ label: "Duration", value: "10 days / 9 nights" }, { label: "Transport", value: "Rail & private transfer" }, { label: "Departure", value: "Tokyo" }, { label: "Travel style", value: "Small group" }],
  },
  schema: z.object({ eyebrow: optionalString, title: z.string(), summary: optionalString, image: optionalString, imageAlt: optionalString, priceLabel: optionalString, price: optionalString, facts: z.array(factSchema).optional(), primaryLabel: optionalString, primaryHref: optionalString, backLabel: optionalString, backHref: optionalString }).passthrough(),
  fields: [
    { id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "summary", label: "Summary", type: "textarea", rows: 4 }, { id: "image", label: "Image", type: "image" }, { id: "imageAlt", label: "Image Alt", type: "text" }, { id: "priceLabel", label: "Price Label", type: "text" }, { id: "price", label: "Price", type: "text" },
    { id: "facts", label: "Quick Facts", type: "repeater", addLabel: "Add Fact", defaultItem: { label: "Label", value: "Value" }, fields: [{ id: "label", label: "Label", type: "text" }, { id: "value", label: "Value", type: "text" }] },
    { id: "primaryLabel", label: "Primary Label", type: "text" }, { id: "primaryHref", label: "Primary Link", type: "url" }, { id: "backLabel", label: "Back Label", type: "text" }, { id: "backHref", label: "Back Link", type: "url" },
  ],
} satisfies BlockDefinition;
export default vietTourOverviewBlock;
