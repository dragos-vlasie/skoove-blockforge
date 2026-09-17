import { z } from "zod";
import {
  BlockType,
  ContentGraph,
  NavigationItem,
  ValidationIssue,
} from "../../../types";
import { blockDefinitions } from "../../blocks/registry";
import { clientExtensionManifestSchema } from "../../extensions/manifest";

const recordSchema = z.record(z.string(), z.unknown());
const optionalString = z.string().optional();

const contentStatusSchema = z.enum(["draft", "published", "archived"]);
const robotsDirectiveSchema = z.enum(["index,follow", "noindex,follow", "noindex,nofollow"]);
const twitterCardSchema = z.enum(["summary", "summary_large_image"]);
const sitemapChangeFrequencySchema = z.enum([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
]);
const schemaTypeSchema = z.enum(["WebPage", "Article", "Product", "Person", "CollectionPage"]);
const fieldTypeSchema = z.enum([
  "text",
  "textarea",
  "richText",
  "number",
  "boolean",
  "date",
  "image",
  "url",
]);
const collectionPresetSchema = z.enum([
  "article",
  "docs",
  "product",
  "case-study",
  "person",
  "landing",
  "generic",
]);

const blueprintFieldSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    type: fieldTypeSchema,
    required: z.boolean().optional(),
    placeholder: optionalString,
    helpText: optionalString,
    defaultValue: z.unknown().optional(),
  })
  .passthrough();

const blueprintBlockSchema = z
  .object({
    type: z.union([z.nativeEnum(BlockType), z.string().regex(/^CUSTOM:[A-Z0-9][A-Z0-9_-]*$/)]),
    content: recordSchema.optional(),
  })
  .passthrough();

const contentBlueprintSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    outcome: z.string(),
    subject: z.enum(["page", "entry"]),
    category: z.enum(["blank", "home", "landing", "listing", "detail", "contact", "editorial", "legal"]),
    source: z.enum(["pack", "custom"]),
    packId: optionalString,
    patternId: optionalString,
    templateId: z.string(),
    collectionMatch: z
      .object({
        presets: z.array(collectionPresetSchema).optional(),
        terms: z.array(z.string()).optional(),
      })
      .optional(),
    blocks: z.array(blueprintBlockSchema),
    essentialFields: z.array(blueprintFieldSchema).optional(),
    defaults: z
      .object({
        title: optionalString,
        seoDescription: optionalString,
        fields: recordSchema.optional(),
      })
      .optional(),
    preview: z
      .object({
        eyebrow: optionalString,
        title: optionalString,
        description: optionalString,
        tone: z.enum(["neutral", "editorial", "conversion", "catalogue"]).optional(),
      })
      .optional(),
    sourceSubjectId: optionalString,
    createdAt: optionalString,
  })
  .passthrough();

const blockDataSchemas = blockDefinitions.map((definition) =>
  z
    .object({
      id: z.string(),
      type: z.literal(definition.type),
      content: definition.schema,
    })
    .passthrough(),
);

const registeredBlockTypes = new Set(blockDefinitions.map((definition) => definition.type));
const fallbackBlockDataSchemas = Object.values(BlockType)
  .filter((type) => !registeredBlockTypes.has(type))
  .map((type) =>
    z
      .object({
        id: z.string(),
        type: z.literal(type),
        content: recordSchema.default({}),
      })
      .passthrough(),
  );

const customBlockDataSchema = z
  .object({
    id: z.string(),
    type: z.string().regex(/^CUSTOM:[A-Z0-9][A-Z0-9_-]*$/),
    content: recordSchema.default({}),
  })
  .passthrough();

export const blockDataSchema = z.union([
  z.discriminatedUnion("type", [
    ...blockDataSchemas,
    ...fallbackBlockDataSchemas,
  ] as any),
  customBlockDataSchema,
]);

export const seoDataSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    ogImage: optionalString,
    keywords: optionalString,
    canonical: optionalString,
    robots: robotsDirectiveSchema.optional(),
    ogTitle: optionalString,
    ogDescription: optionalString,
    twitterCard: twitterCardSchema.optional(),
    schemaType: schemaTypeSchema.optional(),
    changeFrequency: sitemapChangeFrequencySchema.optional(),
    sitemapPriority: z.number().optional(),
  })
  .passthrough();

const organizationConfigSchema = z
  .object({
    name: z.string(),
    logo: optionalString,
    sameAs: z.array(z.string()).default([]),
  })
  .passthrough();

const designConfigSchema = z
  .object({
    themeId: z.string().default("base"),
    primaryColor: z.string().default("#2563eb"),
    accentColor: z.string().default("#7c3aed"),
    backgroundColor: z.string().default("#ffffff"),
    textColor: z.string().default("#0f172a"),
    headingFont: z.string().default("Inter"),
    bodyFont: z.string().default("Inter"),
    radius: z.enum(["sm", "md", "lg"]).default("md"),
  })
  .passthrough();

const localeConfigSchema = z
  .object({
    code: z.string(),
    label: z.string(),
    hreflang: optionalString,
    pathPrefix: optionalString,
    direction: z.enum(["ltr", "rtl"]).optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough();

const localeRoutingConfigSchema = z
  .object({
    strategy: z.enum(["prefix-all", "prefix-except-default", "explicit"]),
    categoryBasePath: optionalString,
  })
  .passthrough();

const siteConfigSchema = z
  .object({
    siteName: z.string(),
    siteUrl: z.string(),
    starterId: optionalString,
    enabledPacks: z.array(z.string()).optional(),
    clientExtensions: z.array(clientExtensionManifestSchema).optional(),
    editorMode: z.enum(["client", "builder"]).optional(),
    logo: optionalString,
    favicon: optionalString,
    defaultLocale: z.string(),
    locales: z.array(localeConfigSchema).optional(),
    localeRouting: localeRoutingConfigSchema.optional(),
    localeMessages: z.record(z.string(), z.record(z.string(), z.string())).optional(),
    defaultTitlePattern: z.string(),
    defaultDescription: z.string(),
    defaultOgImage: z.string(),
    design: designConfigSchema.optional(),
    enabledFeatures: z
      .object({
        contentModels: z.boolean().optional(),
        mediaLibrary: z.boolean().optional(),
        sharedBlocks: z.boolean().optional(),
      })
      .optional()
      .default({}),
    organization: organizationConfigSchema,
    socialProfiles: z.array(z.string()).default([]),
  })
  .passthrough();

const baseContentSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    locale: optionalString,
    translationGroupId: optionalString,
    path: optionalString,
    status: contentStatusSchema,
    templateId: optionalString,
    seo: seoDataSchema,
    blocks: z.array(blockDataSchema),
    updatedAt: z.string(),
  })
  .passthrough();

const pageContentSchema = baseContentSchema.extend({
  kind: z.literal("page"),
  name: optionalString,
  parentId: z.string().nullable().optional(),
  order: z.number(),
  showInNavigation: z.boolean(),
  navigationLabel: optionalString,
});

const fieldDefinitionSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    type: fieldTypeSchema,
    required: z.boolean(),
  })
  .passthrough();

const emptyCollectionIndexSeo = {
  title: "",
  description: "",
  ogImage: "",
  robots: "index,follow" as const,
  twitterCard: "summary_large_image" as const,
  schemaType: "CollectionPage" as const,
};

const collectionDefinitionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    singularName: z.string(),
    routeParentId: z.string().nullable().optional(),
    slug: z.string(),
    locale: optionalString,
    translationGroupId: optionalString,
    path: optionalString,
    description: z.string(),
    preset: collectionPresetSchema,
    schemaType: schemaTypeSchema,
    entryTemplateId: optionalString,
    indexTemplateId: optionalString,
    hasBlocks: z.boolean(),
    publicIndex: z.boolean().default(false),
    seo: seoDataSchema.default(emptyCollectionIndexSeo),
    fields: z.array(fieldDefinitionSchema),
    categoryIds: z.array(z.string()).default([]),
    updatedAt: z.string(),
  })
  .passthrough();

const collectionEntrySchema = baseContentSchema.extend({
  kind: z.literal("collectionEntry"),
  collectionId: z.string(),
  excerpt: optionalString,
  author: optionalString,
  publishedAt: optionalString,
  categoryIds: z.array(z.string()).default([]),
  fields: recordSchema.default({}),
});

const sharedBlockSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: contentStatusSchema,
    locale: optionalString,
    translationGroupId: optionalString,
    block: blockDataSchema,
    updatedAt: z.string(),
  })
  .passthrough();

const categorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    locale: optionalString,
    translationGroupId: optionalString,
    path: optionalString,
    parentId: z.string().nullable().optional(),
    description: z.string(),
    indexTemplateId: optionalString,
    publicIndex: z.boolean(),
    collectionIds: z.array(z.string()).default([]),
    seo: seoDataSchema,
    updatedAt: z.string(),
  })
  .passthrough();

const navigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      label: z.string(),
      targetType: z.enum(["page", "entry", "collection", "category", "url"]),
      targetId: optionalString,
      href: optionalString,
      children: z.array(navigationItemSchema).optional(),
    })
    .passthrough(),
);

const navigationMenuSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    location: z.enum(["header", "footer"]),
    locale: optionalString,
    translationGroupId: optionalString,
    items: z.array(navigationItemSchema),
  })
  .passthrough();

const assetMetaSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    filename: z.string().default(""),
    storageProvider: z.enum(["local", "github", "supabase", "external"]).optional(),
    storagePath: optionalString,
    bucket: optionalString,
    originalName: optionalString,
    mimeType: optionalString,
    size: z.number().optional(),
    alt: z.string(),
    folder: optionalString,
    tags: z.array(z.string()).default([]),
    width: z.number().optional(),
    height: z.number().optional(),
    createdAt: optionalString,
    updatedAt: optionalString,
    focalPoint: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .optional(),
  })
  .passthrough();

const redirectRuleSchema = z
  .object({
    id: z.string(),
    from: z.string(),
    to: z.string(),
    status: z.union([z.literal(301), z.literal(302)]),
  })
  .passthrough();

const blueprintAssignmentSchema = z
  .object({
    id: z.string(),
    subjectKind: z.enum(["page", "entry"]),
    subjectId: z.string(),
    status: z.enum(["assigned", "custom"]),
    patternId: optionalString,
    blueprintId: optionalString,
    updatedAt: z.string(),
  })
  .passthrough();

export const contentGraphSchema = z
  .object({
    version: z.literal(1).default(1),
    updatedAt: z.string().default(() => new Date().toISOString()),
    site: siteConfigSchema,
    pages: z.array(pageContentSchema).default([]),
    collectionDefinitions: z.array(collectionDefinitionSchema).default([]),
    entries: z.array(collectionEntrySchema).default([]),
    categories: z.array(categorySchema).default([]),
    sharedBlocks: z.array(sharedBlockSchema).default([]),
    navigation: z.array(navigationMenuSchema).default([]),
    assets: z.array(assetMetaSchema).default([]),
    redirects: z.array(redirectRuleSchema).default([]),
    customBlueprints: z.array(contentBlueprintSchema).default([]),
    blueprintAssignments: z.array(blueprintAssignmentSchema).default([]),
  })
  .passthrough();

const manifestOrderSchema = z
  .object({
    pages: z.array(z.string()).default([]),
    collectionDefinitions: z.array(z.string()).default([]),
    entries: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    sharedBlocks: z.array(z.string()).default([]),
    navigation: z.array(z.string()).default([]),
    assets: z.array(z.string()).default([]),
    redirects: z.array(z.string()).default([]),
    customBlueprints: z.array(z.string()).default([]),
    blueprintAssignments: z.array(z.string()).default([]),
  })
  .passthrough();

const emptyManifestOrder: z.infer<typeof manifestOrderSchema> = {
  pages: [],
  collectionDefinitions: [],
  entries: [],
  categories: [],
  sharedBlocks: [],
  navigation: [],
  assets: [],
  redirects: [],
  customBlueprints: [],
  blueprintAssignments: [],
};

export const contentManifestSchema = z
  .object({
    version: z.literal(1).default(1),
    updatedAt: z.string().default(() => new Date().toISOString()),
    order: manifestOrderSchema.default(emptyManifestOrder),
  })
  .passthrough();

export type ContentManifest = z.infer<typeof contentManifestSchema>;

const schemaIssueMessage = (issue: z.core.$ZodIssue) => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "graph";
  return `${path}: ${issue.message}`;
};

export const formatSchemaValidationError = (error: z.ZodError) =>
  error.issues.map(schemaIssueMessage).join("; ");

export const parseContentGraph = (value: unknown, label = "CMS content graph"): ContentGraph => {
  const result = contentGraphSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label} failed schema validation: ${formatSchemaValidationError(result.error)}`);
  }

  return result.data as ContentGraph;
};

export const parseContentManifest = (value: unknown, label = "CMS content manifest"): ContentManifest => {
  const result = contentManifestSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label} failed schema validation: ${formatSchemaValidationError(result.error)}`);
  }

  return result.data;
};

export const validateContentGraphShape = (value: unknown): ValidationIssue[] => {
  const result = contentGraphSchema.safeParse(value);
  if (result.success) return [];

  return result.error.issues.map((issue, index) => {
    const message = schemaIssueMessage(issue);

    return {
      id: `schema-error-${index}-${message}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      level: "error",
      scope: "content",
      message: `Invalid CMS JSON: ${message}`,
    };
  });
};
