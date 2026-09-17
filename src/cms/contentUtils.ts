import { cloneDefaultBlockContent } from "../blocks/registry";
import { getEntryPath, getPagePath } from "../lib/cms/routing";
import { getDefaultEntryTemplateId } from "../templates/registry";
import {
  BlockType,
  type BlockData,
  type CollectionDefinition,
  type CollectionEntry,
  type ContentGraph,
  type FieldDefinition,
  type PageContent,
  type SharedBlock,
} from "../../types";
import type { CreateContentDraft } from "./types";

export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const now = () => new Date().toISOString();

export const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";

export const makeUniqueValue = (baseValue: string, usedValues: string[], separator: " " | "-" = " ") => {
  const normalize = (value: string) => value.trim().toLowerCase();
  const base = baseValue.trim() || "Untitled";
  const used = new Set(usedValues.map(normalize));

  if (!used.has(normalize(base))) return base;

  let index = 2;
  let candidate = `${base}${separator}${index}`;
  while (used.has(normalize(candidate))) {
    index += 1;
    candidate = `${base}${separator}${index}`;
  }

  return candidate;
};

export const makeUniqueSlug = (baseValue: string, usedSlugs: string[]) =>
  makeUniqueValue(slugify(baseValue), usedSlugs.map(slugify), "-");

const collectRichText = (node: any): string => {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  const children = Array.isArray(node.content) ? node.content.map(collectRichText).join("") : "";

  if (["paragraph", "heading", "listItem"].includes(node.type)) return `${children}\n`;
  if (["doc", "bulletList", "orderedList"].includes(node.type)) return children;
  return children;
};

export const richTextToPlainText = (nodes: any) => collectRichText(nodes).trim();

export const emptyRichTextDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [],
    },
  ],
};

export const plainTextToRichText = (value: string) => ({
  type: "doc",
  content: value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
});

export const emptySeo = (title: string) => ({
  title,
  description: "",
  ogTitle: title,
  ogDescription: "",
  ogImage: "",
  robots: "index,follow" as const,
  twitterCard: "summary_large_image" as const,
  schemaType: "WebPage" as const,
});

export const createPage = (): PageContent => ({
  id: createId("page"),
  kind: "page",
  title: "New Page",
  name: "New Page",
  slug: "new-page",
  status: "draft",
  templateId: "landing-page",
  parentId: null,
  order: 99,
  showInNavigation: false,
  navigationLabel: "New Page",
  updatedAt: now(),
  seo: emptySeo("New Page"),
  blocks: [
    {
      id: createId("block"),
      type: BlockType.TEXT,
      content: cloneDefaultBlockContent(BlockType.TEXT),
    },
  ],
});

export const createEntry = (definition: CollectionDefinition): CollectionEntry => ({
  id: createId("entry"),
  kind: "collectionEntry",
  collectionId: definition.id,
  title: `New ${definition.singularName}`,
  slug: slugify(`new-${definition.singularName}`),
  status: "draft",
  templateId: definition.entryTemplateId ?? getDefaultEntryTemplateId(definition),
  excerpt: "",
  author: "",
  publishedAt: now(),
  categoryIds: [],
  fields: Object.fromEntries(definition.fields.map((field) => [field.id, field.type === "richText" ? emptyRichTextDoc : ""])),
  updatedAt: now(),
  seo: {
    ...emptySeo(`New ${definition.singularName}`),
    schemaType: definition.schemaType,
  },
  blocks: definition.hasBlocks
    ? [
        {
          id: createId("block"),
          type: BlockType.TEXT,
          content: cloneDefaultBlockContent(BlockType.TEXT),
        },
      ]
    : [],
});

export const createSharedBlock = (block?: BlockData, name = "New shared block"): SharedBlock => {
  const nextBlock = block
    ? clone(block)
    : {
        id: createId("block"),
        type: BlockType.CTA,
        content: cloneDefaultBlockContent(BlockType.CTA),
      };

  nextBlock.id = createId("block");

  return {
    id: createId("shared-block"),
    name,
    status: "draft",
    block: nextBlock,
    updatedAt: now(),
  };
};

export const contentPath = (
  item: PageContent | CollectionEntry,
  graph: ContentGraph,
  definition?: CollectionDefinition | null,
) => ("collectionId" in item ? getEntryPath(item, definition ?? undefined, graph) : getPagePath(item, graph));

export const emptyCreateDraft = (): CreateContentDraft => ({
  type: "page",
  title: "",
  slug: "",
  parentId: "",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  blueprintId: "",
  requiredFields: {},
});

export const trimRoute = (path: string) => path.replace(/^\/+|\/+$/g, "");

export const missingRequiredField = (field: FieldDefinition, value: any) => {
  if (field.type === "boolean") return value !== true;
  if (field.type === "number") return value === "" || value === null || value === undefined || Number.isNaN(Number(value));
  return String(value ?? "").trim() === "";
};

export const createFieldKey = (fieldId: string) => `field:${fieldId}`;

export const createFieldDomId = (key: string) => `create-${key.replace(/[^a-z0-9_-]/gi, "-")}`;
