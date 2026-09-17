import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const rentalFeaturesBlock = {
  type: BlockType.RENTAL_FEATURES,
  label: "Features",
  shortLabel: "F",
  category: "Rental car",
  order: 20,
  defaultContent: {
    heading: "Our Features",
    featuredText: "Why choose us",
    features: [
      {
        title: "Easy pickup",
        description: "Choose pickup and dropoff details before selecting the best vehicle for your trip.",
        buttonText: "Book now",
        path: "/city-rent/feature-car.jpeg",
        alt: "Rental car feature",
      },
      {
        title: "Local support",
        description: "Get friendly help from a local team that knows Madeira and its roads.",
        buttonText: "Contact us",
        path: "/city-rent/background.jpeg",
        alt: "Madeira road view",
      },
    ],
  },
  schema: z
    .object({
      heading: z.string(),
      featuredText: optionalString,
      features: z.array(
        z
          .object({
            title: z.string(),
            description: z.string(),
            buttonText: optionalString,
            path: optionalString,
            alt: optionalString,
          })
          .passthrough(),
      ),
    })
    .passthrough(),
  fields: [
    { id: "heading", label: "Heading", type: "text" },
    { id: "featuredText", label: "Featured Text", type: "text" },
    {
      id: "features",
      label: "Features",
      type: "repeater",
      addLabel: "Add Feature",
      defaultItem: { title: "Feature", description: "Feature description.", buttonText: "Book now", path: "", alt: "" },
      fields: [
        { id: "title", label: "Title", type: "text" },
        { id: "description", label: "Description", type: "textarea", rows: 4 },
        { id: "buttonText", label: "Button Text", type: "text" },
        { id: "path", label: "Image", type: "image" },
        { id: "alt", label: "Image Alt", type: "textarea", rows: 3 },
      ],
    },
  ],
} satisfies BlockDefinition;

export default rentalFeaturesBlock;
