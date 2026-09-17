import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const rentalCtaBlock = {
  type: BlockType.RENTAL_CTA,
  label: "CTA",
  shortLabel: "C",
  category: "Rental car",
  order: 16,
  defaultContent: {
    headline: "DISCOVER MADEIRA WITH US!",
    description: "BOOK NOW",
    imageUrl: "/city-rent/mainback.jpeg",
    imageAlt: "Madeira background",
    buttonText: "CLICK HERE",
    buttonUrl: "/booking/car-selection",
  },
  schema: z
    .object({
      headline: z.string(),
      description: optionalString,
      imageUrl: optionalString,
      imageAlt: optionalString,
      buttonText: optionalString,
      buttonUrl: optionalString,
      image: z.unknown().optional(),
      button: z.unknown().optional(),
    })
    .passthrough(),
  fields: [
    { id: "headline", label: "Headline", type: "text" },
    { id: "description", label: "Description", type: "textarea", rows: 3 },
    { id: "imageUrl", label: "Image", type: "image" },
    { id: "imageAlt", label: "Image Alt", type: "textarea", rows: 3 },
    { id: "buttonText", label: "Button Text", type: "text" },
    { id: "buttonUrl", label: "Button Link", type: "url" },
  ],
} satisfies BlockDefinition;

export default rentalCtaBlock;
