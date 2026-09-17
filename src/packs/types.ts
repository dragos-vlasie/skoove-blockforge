import type { CollectionDefinition, ContentBlueprintDefinition } from "../../types";

export type PackId = "core" | "car-rental" | "travel-agency" | "editorial-publication";

export type PackKind = "core" | "industry";

export type PackBlockClassification = "component" | "preset";

export type PackBlockVisualKind =
  | "hero"
  | "image"
  | "textBlock"
  | "featureGrid"
  | "shared"
  | "cardGrid"
  | "content"
  | "video"
  | "table"
  | "columns"
  | "chart"
  | "accordion"
  | "tabs"
  | "buttonCta"
  | "cta";

export type PackSectionTone = "default" | "soft" | "brand" | "inverse" | "media";

export type PackThemePrimitive =
  | "section"
  | "container"
  | "eyebrow"
  | "heading"
  | "copy"
  | "card"
  | "field"
  | "button"
  | "media";

export type PackDesignContract = {
  version: 1;
  usesSemanticTokens: true;
  coreRecipeVersion: 1;
  themeCompatibility: "all";
  tones: readonly PackSectionTone[];
  primitives: readonly PackThemePrimitive[];
};

export const semanticPackDesignContract = {
  version: 1,
  usesSemanticTokens: true,
  coreRecipeVersion: 1,
  themeCompatibility: "all",
  tones: ["default", "soft", "brand", "inverse", "media"],
  primitives: [
    "section",
    "container",
    "eyebrow",
    "heading",
    "copy",
    "card",
    "field",
    "button",
    "media",
  ],
} as const satisfies PackDesignContract;

export type PackBlockRegistration = {
  type: string;
  name: string;
  classification: PackBlockClassification;
  visualKind?: PackBlockVisualKind;
  canonicalType?: string;
  legacy?: boolean;
};

export type PatternSubjectKind = "page" | "entry";

export type PatternCategory =
  | "home"
  | "landing"
  | "listing"
  | "detail"
  | "contact"
  | "editorial"
  | "legal";

type PatternSignalBase = {
  label: string;
  weight: number;
};

export type PatternSignal =
  | (PatternSignalBase & {
      type: "block";
      values: readonly string[];
      match?: "any" | "all";
    })
  | (PatternSignalBase & {
      type: "collection-name" | "collection-slug" | "route" | "title";
      values: readonly string[];
      match?: "contains" | "exact" | "prefix";
    })
  | (PatternSignalBase & {
      type: "collection-preset" | "schema" | "template";
      values: readonly string[];
    })
  | (PatternSignalBase & {
      type: "field";
      values: readonly string[];
      match?: "any" | "all";
    });

export type PackPatternDefinition = {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  subject: PatternSubjectKind;
  minimumConfidence: number;
  signals: readonly PatternSignal[];
};

export type PackManifest = {
  id: PackId;
  name: string;
  description: string;
  kind: PackKind;
  version: string;
  designContract: PackDesignContract;
  recommendedThemeId?: string;
  blocks: readonly PackBlockRegistration[];
  patterns?: readonly PackPatternDefinition[];
  blueprints?: readonly ContentBlueprintDefinition[];
  collectionPresets?: readonly CollectionDefinition[];
};
