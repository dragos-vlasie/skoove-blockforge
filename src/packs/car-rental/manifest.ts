import { BlockType } from "../../../types";
import { semanticPackDesignContract, type PackManifest } from "../types";

export const carRentalPackManifest = {
  id: "car-rental",
  name: "Car Rental",
  description: "Booking and marketing sections for vehicle rental websites.",
  kind: "industry",
  version: "1.0.0",
  designContract: semanticPackDesignContract,
  recommendedThemeId: "local-trust",
  blocks: [
    { type: BlockType.RENTAL_HERO, name: "Rental Search Hero", classification: "component" },
    { type: BlockType.RENTAL_ABOUT, name: "Rental About", classification: "component" },
    { type: BlockType.RENTAL_FEATURES, name: "Rental Features", classification: "component" },
    { type: BlockType.RENTAL_PROBLEM, name: "Rental Problem", classification: "component" },
    { type: BlockType.RENTAL_CTA, name: "Rental CTA", classification: "component" },
    { type: BlockType.RENTAL_IMAGE_TEXT, name: "Rental Image and Text", classification: "component" },
  ],
} as const satisfies PackManifest;

export default carRentalPackManifest;
