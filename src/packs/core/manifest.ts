import { BlockType } from "../../../types";
import { semanticPackDesignContract, type PackManifest } from "../types";
import { corePatterns } from "./patterns";
import { coreBlueprints } from "./blueprints";

export const corePackManifest = {
  id: "core",
  name: "Core",
  description: "General-purpose sections available to every website.",
  kind: "core",
  version: "1.0.0",
  designContract: semanticPackDesignContract,
  recommendedThemeId: "clean-saas",
  patterns: corePatterns,
  blueprints: coreBlueprints,
  blocks: [
    { type: BlockType.HERO, name: "Hero", classification: "component" },
    { type: BlockType.MEDIA, name: "Media", classification: "component" },
    { type: BlockType.TEXT, name: "Text", classification: "component" },
    { type: BlockType.FEATURES, name: "Features", classification: "component" },
    { type: BlockType.LOGO_CLOUD, name: "Logo Cloud", classification: "component" },
    { type: BlockType.FEATURE_BENTO, name: "Feature Bento", classification: "preset", canonicalType: BlockType.UI_CARD_GRID, legacy: true },
    { type: BlockType.IMAGE_TEXT, name: "Image and Text", classification: "component" },
    { type: BlockType.TESTIMONIALS, name: "Testimonials", classification: "component" },
    { type: BlockType.PRICING, name: "Pricing", classification: "component" },
    { type: BlockType.BLOG_GRID, name: "Content Grid", classification: "component" },
    { type: BlockType.CONTACT_FORM, name: "Contact Form", classification: "component" },
    { type: BlockType.NEWSLETTER_SIGNUP, name: "Newsletter Signup", classification: "component" },
    { type: BlockType.FAQ, name: "FAQ", classification: "component" },
    { type: BlockType.IMAGE_GALLERY, name: "Image Gallery", classification: "component" },
    { type: BlockType.VIDEO_EMBED, name: "Video", classification: "component" },
    { type: BlockType.TABLE, name: "Table", classification: "component" },
    { type: BlockType.CTA, name: "Call to Action", classification: "component" },
    { type: BlockType.STATS, name: "Statistics", classification: "component" },
    { type: BlockType.UI_ACCORDION, name: "Accordion", classification: "preset", canonicalType: BlockType.FAQ, legacy: true },
    { type: BlockType.UI_TABS, name: "Tabs", classification: "component" },
    { type: BlockType.UI_CARD_GRID, name: "Card Grid", classification: "component" },
    { type: BlockType.UI_BUTTON_CTA, name: "Button CTA", classification: "preset", canonicalType: BlockType.CTA, legacy: true },
    { type: BlockType.TWO_COLUMN, name: "Mixed Content", classification: "component" },
    { type: BlockType.SHARED_BLOCK, name: "Shared Section", classification: "preset", legacy: true },
  ],
} as const satisfies PackManifest;

export default corePackManifest;
