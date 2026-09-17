import { semanticPackDesignContract, type PackManifest } from "../types";
import { BlockType } from "../../../types";
import { travelAgencyPatterns } from "./patterns";
import { travelAgencyBlueprints } from "./blueprints";
import { travelAgencyCollectionPresets } from "./collections";

export const travelAgencyPackManifest = {
  id: "travel-agency",
  name: "Travel Agency",
  description: "Tour discovery, comparison, scheduling, and enquiry sections for travel agencies.",
  kind: "industry",
  version: "1.0.0",
  designContract: semanticPackDesignContract,
  recommendedThemeId: "editorial-travel",
  patterns: travelAgencyPatterns,
  blueprints: travelAgencyBlueprints,
  collectionPresets: travelAgencyCollectionPresets,
  blocks: [
    {
      type: BlockType.TRAVEL_EDITORIAL_HERO,
      name: "Editorial Hero",
      classification: "preset",
      visualKind: "hero",
      canonicalType: "HERO",
      legacy: true,
    },
    {
      type: BlockType.TRAVEL_SECTION_HEADING,
      name: "Section Heading",
      classification: "preset",
      visualKind: "textBlock",
      canonicalType: "TEXT",
      legacy: true,
    },
    {
      type: BlockType.TRAVEL_FEATURED_OFFER,
      name: "Featured Tour",
      classification: "component",
      visualKind: "cardGrid",
    },
    {
      type: BlockType.TRAVEL_JOURNEY_GRID,
      name: "Journey Grid",
      classification: "component",
      visualKind: "cardGrid",
    },
    {
      type: BlockType.TRAVEL_TRUST_STRIP,
      name: "Trust Strip",
      classification: "preset",
      visualKind: "featureGrid",
      canonicalType: "FEATURES",
      legacy: true,
    },
    {
      type: BlockType.TRAVEL_CONTACT_CTA,
      name: "Contact CTA",
      classification: "preset",
      visualKind: "cta",
      canonicalType: "CTA",
      legacy: true,
    },
    {
      type: BlockType.TRAVEL_TOUR_CATALOGUE,
      name: "Tour Catalogue",
      classification: "component",
      visualKind: "content",
    },
    {
      type: BlockType.TRAVEL_TOUR_OVERVIEW,
      name: "Tour Overview",
      classification: "component",
      visualKind: "content",
    },
    {
      type: BlockType.TRAVEL_DEPARTURE_SCHEDULE,
      name: "Departure Schedule",
      classification: "component",
      visualKind: "table",
    },
    {
      type: BlockType.TRAVEL_PROGRAMME_LINK,
      name: "Programme Link",
      classification: "component",
      visualKind: "buttonCta",
    },
    {
      type: BlockType.TRAVEL_TOUR_STORY,
      name: "Tour Story",
      classification: "preset",
      visualKind: "image",
      canonicalType: "IMAGE_TEXT",
      legacy: true,
    },
    {
      type: BlockType.TRAVEL_TOUR_ENQUIRY,
      name: "Tour Enquiry",
      classification: "component",
      visualKind: "content",
    },
    {
      type: BlockType.TRAVEL_TOUR_PACKAGE,
      name: "Tour Package",
      classification: "component",
      visualKind: "content",
    },
  ],
} as const satisfies PackManifest;

export default travelAgencyPackManifest;
