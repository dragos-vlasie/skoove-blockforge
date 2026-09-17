import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const rentalHeroBlock = {
  type: BlockType.RENTAL_HERO,
  label: "Hero",
  shortLabel: "H",
  category: "Rental car",
  order: 12,
  defaultContent: {
    heading: "FIND THE B E S T FOR YOUR RIDE",
    description: "NO DEPOSIT. NO CREDIT CARD. INSURANCE AND UNLIMITED MILEAGE.",
    imageUrl: "/city-rent/12237905.jpg",
    imageAltText: "City Car Rent hero background",
    pickupLocation: "City Car Rent Office (Rua 31 de Janeiro)",
    dropoffLocation: "City Car Rent Office (Rua 31 de Janeiro)",
    pickupDate: "12/06/2026 09:00",
    dropoffDate: "13/06/2026 09:00",
    searchButtonText: "Search",
    avatarNumber: "Manual & Automatic",
    avatarLabel: "Cars",
    avatars: [
      { src: "/city-rent/volkswagen-up.png", alt: "Volkswagen UP" },
      { src: "/city-rent/opel-corsa.png", alt: "Opel Corsa" },
      { src: "/city-rent/skoda-fabia.png", alt: "Skoda Fabia AUTO" },
      { src: "/city-rent/skoda-kamiq.png", alt: "Skoda Kamiq AUTO" },
    ],
  },
  schema: z
    .object({
      heading: z.string(),
      description: optionalString,
      imageUrl: z.string(),
      imageAltText: optionalString,
      pickupLocation: optionalString,
      dropoffLocation: optionalString,
      pickupDate: optionalString,
      dropoffDate: optionalString,
      searchButtonText: optionalString,
      avatarNumber: optionalString,
      avatarLabel: optionalString,
      avatars: z
        .array(
          z
            .object({
              src: z.string(),
              alt: optionalString,
            })
            .passthrough(),
        )
        .optional(),
      testimonials_avatars: z.unknown().optional(),
    })
    .passthrough(),
  fields: [
    { id: "heading", label: "Heading", type: "textarea", rows: 2 },
    { id: "description", label: "Description", type: "textarea", rows: 3 },
    { id: "imageUrl", label: "Background Image", type: "image" },
    { id: "imageAltText", label: "Image Alt Text", type: "textarea", rows: 3 },
    { id: "pickupLocation", label: "Pickup Location", type: "text" },
    { id: "dropoffLocation", label: "Dropoff Location", type: "text" },
    { id: "pickupDate", label: "Pickup Date Text", type: "text" },
    { id: "dropoffDate", label: "Dropoff Date Text", type: "text" },
    { id: "searchButtonText", label: "Search Button Text", type: "text" },
    { id: "avatarNumber", label: "Avatar Prefix", type: "text" },
    { id: "avatarLabel", label: "Avatar Label", type: "text" },
    {
      id: "avatars",
      label: "Vehicle Avatars",
      type: "repeater",
      addLabel: "Add Avatar",
      defaultItem: { src: "", alt: "" },
      fields: [
        { id: "src", label: "Image", type: "image" },
        { id: "alt", label: "Alt Text", type: "textarea", rows: 3 },
      ],
    },
  ],
} satisfies BlockDefinition;

export default rentalHeroBlock;
