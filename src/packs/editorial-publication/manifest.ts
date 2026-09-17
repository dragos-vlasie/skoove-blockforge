import { editorialPublicationBlueprints } from "./blueprints";
import { editorialPublicationCollectionPresets } from "./collections";
import { editorialPublicationPatterns } from "./patterns";
import { semanticPackDesignContract, type PackManifest } from "../types";
import { BlockType } from "../../../types";

export const editorialPublicationPackManifest = {
  id: "editorial-publication",
  name: "Editorial Publication",
  description: "Articles, topic collections, authorship, and long-form publishing for magazines and independent publications.",
  kind: "industry",
  version: "1.0.0",
  designContract: semanticPackDesignContract,
  recommendedThemeId: "field-journal",
  patterns: editorialPublicationPatterns,
  blueprints: editorialPublicationBlueprints,
  collectionPresets: editorialPublicationCollectionPresets,
  blocks: [
    {
      type: BlockType.PUBLICATION_HERO,
      name: "Creator Travel Hero",
      classification: "component",
      visualKind: "hero",
    },
    {
      type: BlockType.PUBLICATION_GATEWAY_CAROUSEL,
      name: "Publication Gateway Carousel",
      classification: "component",
      visualKind: "content",
    },
  ],
} as const satisfies PackManifest;

export default editorialPublicationPackManifest;
