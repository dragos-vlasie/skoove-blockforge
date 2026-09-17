import { z } from "zod";
import { type BlockTypeId, type FieldType } from "../../types";

type ScalarBlockField = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  rows?: number;
};

type SelectBlockField = {
  id: string;
  label: string;
  type: "select";
  required?: boolean;
  options: Array<{
    label: string;
    value: string;
  }>;
  helpText?: string;
};

type RepeaterBlockField = {
  id: string;
  label: string;
  type: "repeater";
  required?: boolean;
  addLabel: string;
  defaultItem: Record<string, unknown>;
  fields: Array<ScalarBlockField | SelectBlockField>;
};

export type BlockEditorField = ScalarBlockField | SelectBlockField | RepeaterBlockField;

export type BlockPresetDefinition = {
  id: string;
  name: string;
  description: string;
  content: Record<string, unknown>;
  recommended?: boolean;
};

export type BlockCompositionRole = "section" | "content" | "both";

export type BlockDefinition = {
  type: BlockTypeId;
  packId?: string;
  label: string;
  shortLabel: string;
  category?: string;
  order: number;
  defaultContent: Record<string, unknown>;
  previewContent?: Record<string, unknown>;
  schema: z.ZodTypeAny;
  fields: BlockEditorField[];
  presets?: BlockPresetDefinition[];
  compositionRole?: BlockCompositionRole;
};

export const optionalString = z.string().optional();

const richTextMarkSchema = z
  .object({
    type: optionalString,
    attrs: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const richTextNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      type: optionalString,
      text: optionalString,
      attrs: z.record(z.string(), z.unknown()).optional(),
      marks: z.array(richTextMarkSchema).optional(),
      content: z.array(richTextNodeSchema).optional(),
    })
    .passthrough(),
);

export const richTextDocSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(richTextNodeSchema).optional(),
  })
  .passthrough();

export const galleryImageSchema = z.union([
  z.string(),
  z
    .object({
      src: z.string(),
      alt: optionalString,
    })
    .passthrough(),
]);
