import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const rentalImageTextBlock = {
  type: BlockType.RENTAL_IMAGE_TEXT,
  label: "Image/Text",
  shortLabel: "IT",
  category: "Rental car",
  order: 18,
  defaultContent: {
    imageSrc: "/city-rent/background.jpeg",
    title: "Explore Madeira with Ease",
    content:
      "Discover the beautiful island of Madeira with the convenience and flexibility of your own rental car. Whether you're visiting the Laurisilva forest, driving coastal roads, or exploring charming villages, our vehicles help you move freely.",
    eyebrow: "Freedom to roam",
    imageLeft: true,
  },
  schema: z
    .object({
      imageSrc: z.string(),
      title: z.string(),
      content: optionalString,
      eyebrow: optionalString,
      imageLeft: z.boolean().optional(),
    })
    .passthrough(),
  fields: [
    { id: "imageSrc", label: "Image", type: "image" },
    { id: "title", label: "Title", type: "text" },
    { id: "content", label: "Content", type: "textarea", rows: 8 },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "imageLeft", label: "Image Left", type: "boolean" },
  ],
} satisfies BlockDefinition;

export default rentalImageTextBlock;
