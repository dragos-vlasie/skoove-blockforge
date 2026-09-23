/** Shared by stored section content, rich-text nodes and both renderers. */
export const spacerHeights = [4, 8, 12, 16, 20] as const;
export type SpacerHeight = typeof spacerHeights[number];
export const defaultSpacerHeight: SpacerHeight = 16;
export const spacerContentCapability = "content-spacer-v1";

export function normalizeSpacerHeight(value: unknown): SpacerHeight {
  const height = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return spacerHeights.includes(height as SpacerHeight) ? height as SpacerHeight : defaultSpacerHeight;
}

export const spacerHeightClasses: Record<SpacerHeight, string> = {
  4: "h-[4px]", 8: "h-[8px]", 12: "h-[12px]", 16: "h-[16px]", 20: "h-[20px]",
};
