import type { BlockEditorField } from "../blocks/types";
import type { CollectionDefinition, CollectionEntry } from "../../types";

const nestedBlockPrefix = "@nested";
const sharedBlockPrefix = "@shared";

const encodePathSegment = (value: string) => encodeURIComponent(value);

export const appendFieldPath = (prefix: string, path: string) =>
  `${prefix}/${path}`;

export const relativeFieldPath = (path: string | null | undefined, prefix: string) => {
  if (!path) return null;
  const prefixWithSeparator = `${prefix}/`;
  return path.startsWith(prefixWithSeparator)
    ? path.slice(prefixWithSeparator.length)
    : null;
};

export const nestedBlockFieldPrefix = (columnId: string, blockId: string) =>
  `${nestedBlockPrefix}/${encodePathSegment(columnId)}/${encodePathSegment(blockId)}`;

export const sharedBlockFieldPrefix = (sharedBlockId: string) =>
  `${sharedBlockPrefix}/${encodePathSegment(sharedBlockId)}`;

export type PreviewFieldSourceKind = "content" | "entry" | "nested-block" | "shared-block";

export type PreviewFieldSource = {
  navigationPath: string;
  localPath: string;
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  sourceKind: PreviewFieldSourceKind;
  sourceId: string;
  blockId: string;
  blockType: string;
  locale?: string;
  previewValue?: string;
};

export type PreviewFieldSourceMap = Record<string, PreviewFieldSource>;

export type PreviewFieldSourceContext = {
  sourceKind: PreviewFieldSourceKind;
  sourceId: string;
  locale?: string;
  pathPrefix?: string;
};

export const combineFieldPrefixes = (parentPrefix: string | undefined, childPrefix: string) =>
  parentPrefix ? appendFieldPath(parentPrefix, childPrefix) : childPrefix;

export const createBlockFieldSourceMap = ({
  blockId,
  blockType,
  fields,
  content,
  context,
}: {
  blockId: string;
  blockType: string;
  fields: BlockEditorField[];
  content: Record<string, any>;
  context: PreviewFieldSourceContext;
}): PreviewFieldSourceMap => {
  const sourceMap: PreviewFieldSourceMap = {};
  const addSource = (
    localPath: string,
    field: BlockEditorField,
    previewValue: unknown,
    fieldId = field.id,
    fieldLabel = field.label,
    fieldType = field.type,
  ) => {
    sourceMap[localPath] = {
      navigationPath: context.pathPrefix ? appendFieldPath(context.pathPrefix, localPath) : localPath,
      localPath,
      fieldId,
      fieldLabel,
      fieldType,
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      blockId,
      blockType,
      locale: context.locale,
      previewValue: typeof previewValue === "string" ? previewValue : undefined,
    };
  };

  fields.forEach((field) => {
    addSource(field.id, field, content[field.id]);
    if (field.type !== "repeater") return;

    const items = Array.isArray(content[field.id]) ? content[field.id] : [];
    items.forEach((_item, itemIndex) => {
      field.fields.forEach((childField) => {
        const localPath = `${field.id}.${itemIndex}.${childField.id}`;
        addSource(localPath, childField, _item?.[childField.id], childField.id, childField.label, childField.type);
      });
    });
  });

  return sourceMap;
};

const entryBaseFields = [
  ["title", "Title", "text"],
  ["slug", "Slug", "text"],
  ["status", "Status", "select"],
  ["excerpt", "Excerpt", "textarea"],
  ["author", "Author", "text"],
  ["publishedAt", "Publish date", "date"],
  ["categoryIds", "Categories", "references"],
] as const;

const entrySeoFields = [
  ["title", "SEO title", "text"],
  ["description", "SEO description", "textarea"],
  ["ogImage", "Open Graph image", "image"],
  ["keywords", "Keywords", "text"],
  ["canonical", "Canonical URL", "url"],
  ["robots", "Robots", "select"],
  ["ogTitle", "Open Graph title", "text"],
  ["ogDescription", "Open Graph description", "textarea"],
  ["twitterCard", "Twitter card", "select"],
  ["schemaType", "Schema type", "select"],
  ["changeFrequency", "Change frequency", "select"],
  ["sitemapPriority", "Sitemap priority", "number"],
] as const;

const previewStringValue = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const inferredEntryFieldType = (fieldId: string, value: unknown) => {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (value && typeof value === "object" && (value as { type?: string }).type === "doc") return "richText";
  if (/image|photo|avatar|thumbnail/i.test(fieldId)) return "image";
  if (/date|published|updated/i.test(fieldId)) return "date";
  if (/url|href|link/i.test(fieldId)) return "url";
  return typeof value === "string" && value.length > 120 ? "textarea" : "text";
};

const inferredEntryFieldLabel = (fieldId: string) => fieldId
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/[-_]+/g, " ")
  .replace(/^./, (character) => character.toUpperCase());

export const entryDefinitionFieldPath = (fieldId: string) => `fields.${fieldId}`;

export const createEntryPreviewContent = (entry: CollectionEntry) => ({
  title: entry.title,
  slug: entry.slug,
  status: entry.status,
  excerpt: entry.excerpt,
  author: entry.author,
  publishedAt: entry.publishedAt,
  categoryIds: entry.categoryIds,
  fields: entry.fields ?? {},
  seo: entry.seo ?? {},
});

export const createEntryFieldSourceMap = ({
  entry,
  definition,
  locale = entry.locale,
}: {
  entry: CollectionEntry;
  definition?: CollectionDefinition | null;
  locale?: string;
}): PreviewFieldSourceMap => {
  const sourceMap: PreviewFieldSourceMap = {};
  const addSource = (path: string, label: string, fieldType: string, value: unknown) => {
    sourceMap[path] = {
      navigationPath: path,
      localPath: path,
      fieldId: path.split(".").at(-1) ?? path,
      fieldLabel: label,
      fieldType,
      sourceKind: "entry",
      sourceId: entry.id,
      blockId: `@entry:${entry.id}`,
      blockType: entry.collectionId,
      locale,
      previewValue: previewStringValue(value),
    };
  };

  entryBaseFields.forEach(([path, label, fieldType]) => {
    addSource(path, label, fieldType, entry[path as keyof CollectionEntry]);
  });
  const modeledFieldIds = new Set(definition?.fields.map((field) => field.id) ?? []);
  definition?.fields.forEach((field) => {
    addSource(entryDefinitionFieldPath(field.id), field.label, field.type, entry.fields?.[field.id]);
  });
  Object.entries(entry.fields ?? {}).forEach(([fieldId, value]) => {
    if (modeledFieldIds.has(fieldId)) return;
    addSource(
      entryDefinitionFieldPath(fieldId),
      inferredEntryFieldLabel(fieldId),
      inferredEntryFieldType(fieldId, value),
      value,
    );
  });
  entrySeoFields.forEach(([fieldId, label, fieldType]) => {
    addSource(`seo.${fieldId}`, label, fieldType, entry.seo?.[fieldId as keyof CollectionEntry["seo"]]);
  });

  return sourceMap;
};

export const parseSharedBlockFieldPath = (path: string) => {
  const marker = `${sharedBlockPrefix}/`;
  if (!path.startsWith(marker)) return null;

  const remainder = path.slice(marker.length);
  const separatorIndex = remainder.indexOf("/");
  if (separatorIndex <= 0 || separatorIndex === remainder.length - 1) return null;

  try {
    return {
      sharedBlockId: decodeURIComponent(remainder.slice(0, separatorIndex)),
      path: remainder.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
};
