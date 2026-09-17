import { z } from "zod";
import type {
  ClientExtensionBlockManifest,
  ClientExtensionManifest,
} from "../../types";
import type { BlockDefinition, BlockEditorField } from "../blocks/types";

const extensionFieldSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["text", "textarea", "richText", "number", "boolean", "date", "image", "url", "select"]),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  })
  .superRefine((field, context) => {
    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      context.addIssue({ code: "custom", message: "Select fields require at least one option." });
    }
  });

export const clientExtensionBlockManifestSchema = z
  .object({
    type: z.string().regex(/^CUSTOM:[A-Z0-9][A-Z0-9_-]*$/),
    label: z.string().min(1),
    shortLabel: z.string().min(1).max(4).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    order: z.number().finite().optional(),
    viewModule: z.string().regex(/^src\/[a-zA-Z0-9_./-]+$/),
    defaultContent: z.record(z.string(), z.unknown()),
    fields: z.array(extensionFieldSchema),
  })
  .superRefine((block, context) => {
    const fieldIds = new Set<string>();
    block.fields.forEach((field, index) => {
      if (fieldIds.has(field.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate field id "${field.id}".`,
          path: ["fields", index, "id"],
        });
      }
      fieldIds.add(field.id);
    });
  });

export const clientExtensionManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1),
    version: z.string().min(1),
    repository: z.string().optional(),
    blocks: z.array(clientExtensionBlockManifestSchema).min(1),
  })
  .superRefine((manifest, context) => {
    const blockTypes = new Set<string>();
    manifest.blocks.forEach((block, index) => {
      if (blockTypes.has(block.type)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate custom block type "${block.type}".`,
          path: ["blocks", index, "type"],
        });
      }
      blockTypes.add(block.type);
    });
  });

export const parseClientExtensionManifest = (value: unknown): ClientExtensionManifest =>
  clientExtensionManifestSchema.parse(value) as ClientExtensionManifest;

const extensionFieldToEditorField = (
  field: ClientExtensionBlockManifest["fields"][number],
): BlockEditorField => {
  if (field.type === "select") {
    return {
      id: field.id,
      label: field.label,
      type: "select",
      options: field.options ?? [],
      required: field.required,
      helpText: field.helpText,
    };
  }

  return {
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder,
    helpText: field.helpText,
  };
};

export const getClientExtensionBlockDefinitions = (
  manifests: readonly ClientExtensionManifest[] = [],
): BlockDefinition[] =>
  manifests.flatMap((manifest) =>
    manifest.blocks.map((block, blockIndex) => ({
      type: block.type,
      packId: `extension:${manifest.id}`,
      label: block.label,
      shortLabel: block.shortLabel ?? block.label.slice(0, 2).toUpperCase(),
      category: block.category ?? manifest.name,
      order: block.order ?? 10_000 + blockIndex,
      defaultContent: block.defaultContent,
      schema: z.record(z.string(), z.unknown()),
      fields: block.fields.map(extensionFieldToEditorField),
      compositionRole: "section" as const,
    })),
  );
