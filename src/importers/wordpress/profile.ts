import type { ContentGraph } from "../../../types";
import type { NormalizedWordPressDocument, WordPressLocalizationManifest, WordPressSiteAudit } from "./types";

export type WordPressGraphInput = {
  audit: WordPressSiteAudit;
  documents: NormalizedWordPressDocument[];
  localization?: WordPressLocalizationManifest;
};

/**
 * Installation profiles own client-specific composition. The importer itself
 * only discovers and normalizes WordPress data.
 */
export type WordPressMigrationProfile = {
  id: string;
  name: string;
  buildGraph: (input: WordPressGraphInput) => ContentGraph;
};

export const isWordPressMigrationProfile = (value: unknown): value is WordPressMigrationProfile => {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<WordPressMigrationProfile>;
  return typeof profile.id === "string"
    && typeof profile.name === "string"
    && typeof profile.buildGraph === "function";
};
