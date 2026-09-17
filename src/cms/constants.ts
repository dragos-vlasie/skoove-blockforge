import { blockDefinitions } from "../blocks/registry";
import { BlockType, type FieldType } from "../../types";
import type { CmsTab } from "./types";

export const issueTone = {
  error: "bg-rose-50 text-rose-700 border-rose-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
};

export const statusTone = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

export const tabs: Array<{ id: CmsTab; label: string }> = [
  { id: "editor", label: "Editor" },
  { id: "content", label: "Content" },
  { id: "media", label: "Media" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

export const fieldTypes: FieldType[] = ["text", "textarea", "richText", "number", "boolean", "date", "image", "url"];

export const blockLabels = Object.fromEntries(
  blockDefinitions.map((definition) => [definition.type, definition.label]),
) as Record<BlockType, string>;

export const blockShortLabels = Object.fromEntries(
  blockDefinitions.map((definition) => [definition.type, definition.shortLabel]),
) as Record<BlockType, string>;

export const invalidFieldClass = "border-rose-300 bg-rose-50 text-rose-950 focus:border-rose-500 focus:ring-rose-100";
