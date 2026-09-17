import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

export const vietEditorialHeroBlock = {
  type: BlockType.TRAVEL_EDITORIAL_HERO, label: "Editorial Hero", shortLabel: "EH", category: "Travel Agency", order: 100,
  defaultContent: { eyebrow: "Travel with more meaning", title: "See the world from a different perspective", dek: "Carefully selected journeys combining memorable places, local stories, and thoughtful service.", image: "", imageAlt: "Scenic destination featured in the journey", imageLabel: "Selected journeys", primaryLabel: "Explore tours", primaryHref: "/tours/", secondaryLabel: "Plan my trip", secondaryHref: "/contact/", editionLabel: "Travel Agency · Seasonal collection" },
  schema: z.object({ eyebrow: optionalString, title: z.string(), dek: optionalString, image: optionalString, imageAlt: optionalString, imageLabel: optionalString, primaryLabel: optionalString, primaryHref: optionalString, secondaryLabel: optionalString, secondaryHref: optionalString, editionLabel: optionalString }).passthrough(),
  fields: [
    { id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "dek", label: "Introduction", type: "textarea", rows: 4 },
    { id: "image", label: "Lead Image", type: "image" }, { id: "imageAlt", label: "Image Alt", type: "text" }, { id: "imageLabel", label: "Image Label", type: "text" },
    { id: "primaryLabel", label: "Primary Label", type: "text" }, { id: "primaryHref", label: "Primary Link", type: "url" },
    { id: "secondaryLabel", label: "Secondary Label", type: "text" }, { id: "secondaryHref", label: "Secondary Link", type: "url" },
    { id: "editionLabel", label: "Edition Label", type: "text" },
  ],
} satisfies BlockDefinition;
export default vietEditorialHeroBlock;
