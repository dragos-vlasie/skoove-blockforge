import type { BlockData } from "../../../types";

const compositionLabels = ["Primary", "Supporting", "Additional", "Extra"];

export const getCompositionColumnCount = (layout: unknown) =>
  ["three-equal", "feature-left", "feature-right"].includes(String(layout)) ? 3 : 2;

export const createCompositionDefaults = (layout: unknown) =>
  Array.from({ length: getCompositionColumnCount(layout) }, (_, index) => ({
    id: `column-${index + 1}`,
    label: compositionLabels[index] ?? `Column ${index + 1}`,
    blocks: [] as BlockData[],
  }));

export const normalizeCompositionColumns = (content: Record<string, any>) => {
  const columns = Array.isArray(content?.columns) ? content.columns : [];

  return createCompositionDefaults(content?.layout).map((fallback, index) => {
    const column = columns[index] && typeof columns[index] === "object" ? columns[index] : {};
    return {
      ...fallback,
      ...column,
      blocks: Array.isArray(column.blocks) ? column.blocks : [],
    };
  });
};

export const normalizeCompositionLayout = (layout: unknown) => {
  const value = String(layout || "split");
  if (value === "50-50") return "split";
  if (value === "60-40") return "sidebar-right";
  if (value === "40-60") return "sidebar-left";
  return value;
};
