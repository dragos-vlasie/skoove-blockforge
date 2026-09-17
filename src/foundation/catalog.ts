import { BlockType } from "../../types";

export const foundationThemeIds = [
  "editorial-travel",
  "clean-saas",
  "studio-agency",
] as const;

export type FoundationThemeId = (typeof foundationThemeIds)[number];

export type FoundationComponentContract = {
  type: BlockType;
  purpose: string;
  requiredCapabilities: readonly string[];
};

export const foundationComponentContracts: readonly FoundationComponentContract[] = [
  { type: BlockType.HERO, purpose: "Open a page with a clear promise and action.", requiredCapabilities: ["theme default", "media left/right", "centred", "background image"] },
  { type: BlockType.TEXT, purpose: "Present structured editorial copy and headings.", requiredCapabilities: ["theme default", "standard", "lead", "compact"] },
  { type: BlockType.MEDIA, purpose: "Place a focused image with an optional caption.", requiredCapabilities: ["theme treatment", "aspect ratios", "plain", "framed", "full bleed"] },
  { type: BlockType.IMAGE_TEXT, purpose: "Combine a story, image, and optional action.", requiredCapabilities: ["theme default", "image left/right", "stacked"] },
  { type: BlockType.FEATURES, purpose: "Explain benefits, services, steps, or principles.", requiredCapabilities: ["theme default", "numbered", "cards", "minimal"] },
  { type: BlockType.UI_CARD_GRID, purpose: "Show a flexible collection of linked content cards.", requiredCapabilities: ["theme default", "visual", "bordered", "minimal", "column choice"] },
  { type: BlockType.LOGO_CLOUD, purpose: "Show partners, clients, or trust marks.", requiredCapabilities: ["theme default", "strip", "grid", "monochrome"] },
  { type: BlockType.TESTIMONIALS, purpose: "Present customer or editorial proof.", requiredCapabilities: ["theme default", "cards", "spotlight", "minimal"] },
  { type: BlockType.STATS, purpose: "Highlight a small set of meaningful metrics.", requiredCapabilities: ["theme default", "inverse", "cards", "minimal"] },
  { type: BlockType.PRICING, purpose: "Compare packages, plans, or service levels.", requiredCapabilities: ["theme default", "cards", "featured", "compact"] },
  { type: BlockType.FAQ, purpose: "Answer common questions without overwhelming a page.", requiredCapabilities: ["theme default", "split", "stacked", "minimal"] },
  { type: BlockType.IMAGE_GALLERY, purpose: "Present a visual collection with controlled emphasis.", requiredCapabilities: ["theme default", "grid", "mosaic", "featured"] },
  { type: BlockType.CTA, purpose: "Give the page one clear conversion step.", requiredCapabilities: ["theme default", "panel", "full width", "minimal"] },
  { type: BlockType.CONTACT_FORM, purpose: "Collect a direct enquiry with supporting context.", requiredCapabilities: ["theme default", "split", "centred", "compact"] },
  { type: BlockType.TABLE, purpose: "Present structured comparisons and factual data.", requiredCapabilities: ["theme default", "striped", "bordered", "minimal"] },
] as const;

export const foundationComponentTypes = foundationComponentContracts.map(({ type }) => type);
