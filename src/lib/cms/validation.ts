import { BlockData, BlockType, ContentGraph, NavigationItem, SEOData, ValidationIssue } from "../../../types";
import {
  getCategoryEntries,
  getCategoryPath,
  getCollectionEntries,
  getCollectionPath,
  getEntryPath,
  getPagePath,
  getPublicRouteRecords,
} from "./routing";
import { templatesById, templatesForRoute } from "../../templates/registry";
import type { TemplateRouteType } from "../../templates/types";
import { canonicalLocaleCode, getConfiguredLocales, getContentLocale, getLocalePrefix } from "../../localization/registry";

const createIssue = (
  level: ValidationIssue["level"],
  scope: ValidationIssue["scope"],
  message: string,
  targetId?: string,
): ValidationIssue => ({
  id: `${scope}-${level}-${targetId ?? "site"}-${message}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  level,
  scope,
  message,
  targetId,
});

const hasText = (value?: string) => Boolean(value && value.trim().length > 0);
const normalizeComparable = (value?: string | null) => (value ?? "").trim().toLowerCase();
const normalizeParentId = (value?: string | null) => value || "__root__";
const normalizeRouteSegment = (value?: string | null) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const reservedRouteSegments = new Set(["admin", "api", "assets", "category", "cms", "login", "logout", "media", "uploads"]);
const expectedSchemaByPreset: Record<string, string> = {
  article: "Article",
  "case-study": "Article",
  product: "Product",
  person: "Person",
};

const validateTemplateReference = (
  templateId: string | undefined,
  routeType: TemplateRouteType,
  label: string,
  targetId: string,
  issues: ValidationIssue[],
) => {
  if (!hasText(templateId)) return;

  if (!templatesById[templateId as keyof typeof templatesById]) {
    issues.push(createIssue("error", "content", `${label} uses missing template "${templateId}".`, targetId));
    return;
  }

  if (!templatesForRoute(routeType).some((template) => template.id === templateId)) {
    issues.push(
      createIssue(
        "error",
        "content",
        `${label} uses template "${templateId}" in the wrong route context.`,
        targetId,
      ),
    );
  }
};

const isLocalUrl = (value: string) => value.startsWith("/");
const isUploadedUrl = (value: string) => value.startsWith("/uploads/");

const validateImageReference = (
  value: unknown,
  label: string,
  targetId: string,
  issues: ValidationIssue[],
  graph: ContentGraph,
) => {
  if (typeof value !== "string" || !hasText(value)) return;

  const imageUrl = value.trim();
  if (imageUrl.startsWith("data:")) return;

  if (isLocalUrl(imageUrl)) {
    if (isUploadedUrl(imageUrl) && !graph.assets.some((asset) => asset.url === imageUrl)) {
      issues.push(
        createIssue(
          "warning",
          "assets",
          `${label} uses an uploaded image that is missing from the media library.`,
          targetId,
        ),
      );
    }
    return;
  }

  try {
    const url = new URL(imageUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      issues.push(createIssue("error", "assets", `${label} image URL must use http or https.`, targetId));
    }
  } catch {
    issues.push(createIssue("error", "assets", `${label} image URL is invalid.`, targetId));
  }
};

const validateSeoImage = (
  seo: SEOData | undefined,
  label: string,
  targetId: string,
  issues: ValidationIssue[],
  graph: ContentGraph,
) => {
  validateImageReference(seo?.ogImage, `${label} OpenGraph image`, targetId, issues, graph);
};

const validateAssetLibrary = (graph: ContentGraph, issues: ValidationIssue[]) => {
  const seenUrls = new Map<string, string>();

  graph.assets.forEach((asset) => {
    const label = `Asset "${asset.filename || asset.url || asset.id}"`;

    if (!hasText(asset.url)) {
      issues.push(createIssue("error", "assets", `${label} is missing a URL.`, asset.id));
      return;
    }

    const previousAssetId = seenUrls.get(asset.url);
    if (previousAssetId) {
      issues.push(createIssue("error", "assets", `${label} duplicates another media URL.`, asset.id));
    }
    seenUrls.set(asset.url, asset.id);

    validateImageReference(asset.url, label, asset.id, issues, graph);

    if (!hasText(asset.alt)) {
      issues.push(createIssue("warning", "assets", `${label} is missing alt text.`, asset.id));
    }

    if (asset.mimeType && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(asset.mimeType)) {
      issues.push(createIssue("error", "assets", `${label} uses an unsupported image type.`, asset.id));
    }
  });
};

const validateSeo = (
  seo: SEOData | undefined,
  label: string,
  targetId: string,
  issues: ValidationIssue[],
) => {
  if (!seo || !hasText(seo.title)) {
    issues.push(createIssue("error", "seo", `${label} is missing an SEO title.`, targetId));
  }

  if (!seo || !hasText(seo.description)) {
    issues.push(createIssue("error", "seo", `${label} is missing an SEO description.`, targetId));
  }

  if (seo?.description && seo.description.length < 80) {
    issues.push(
      createIssue(
        "warning",
        "seo",
        `${label} SEO description is short; aim for a useful search snippet.`,
        targetId,
      ),
    );
  }

  if (seo?.title && seo.title.length > 70) {
    issues.push(
      createIssue("warning", "seo", `${label} SEO title is long; aim for a concise title.`, targetId),
    );
  }

  if (seo?.description && seo.description.length > 170) {
    issues.push(
      createIssue("warning", "seo", `${label} SEO description is long; search engines may truncate it.`, targetId),
    );
  }

  if (!seo?.ogImage) {
    issues.push(createIssue("warning", "seo", `${label} is missing an OpenGraph image.`, targetId));
  }

  if (seo?.canonical) {
    try {
      if (!seo.canonical.startsWith("/")) new URL(seo.canonical);
    } catch {
      issues.push(createIssue("error", "seo", `${label} canonical URL is invalid.`, targetId));
    }
  }

  if (
    typeof seo?.sitemapPriority === "number" &&
    (seo.sitemapPriority < 0 || seo.sitemapPriority > 1)
  ) {
    issues.push(createIssue("error", "seo", `${label} sitemap priority must be between 0 and 1.`, targetId));
  }
};

const collectTextFromUnknown = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectTextFromUnknown);

  return Object.values(value).flatMap(collectTextFromUnknown);
};

const hasFieldValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const validateBlocks = (
  blocks: BlockData[],
  label: string,
  targetId: string,
  issues: ValidationIssue[],
  graph: ContentGraph,
) => {
  if (!blocks || blocks.length === 0) {
    issues.push(createIssue("warning", "content", `${label} has no blocks.`, targetId));
    return;
  }

  blocks.forEach((block) => {
    if (block.type.startsWith("CUSTOM:")) {
      const definition = (graph.site.clientExtensions ?? [])
        .flatMap((manifest) => manifest.blocks)
        .find((candidate) => candidate.type === block.type);

      if (!definition) {
        issues.push(
          createIssue(
            "error",
            "content",
            `${label} uses custom block "${block.type}" but its extension manifest is not installed.`,
            targetId,
          ),
        );
        return;
      }

      definition.fields.forEach((field) => {
        const value = block.content?.[field.id];
        if (field.required && !hasFieldValue(value)) {
          issues.push(
            createIssue(
              "error",
              "content",
              `${label} custom block "${definition.label}" is missing required field "${field.label}".`,
              targetId,
            ),
          );
        }
        if (field.type === "image") {
          validateImageReference(value, `${label} ${definition.label} ${field.label}`, targetId, issues, graph);
        }
      });
      return;
    }

    if (block.type === BlockType.SHARED_BLOCK) {
      const refId = block.content?.refId;
      const sharedBlock = graph.sharedBlocks.find((candidate) => candidate.id === refId);

      if (!hasText(refId)) {
        issues.push(createIssue("error", "content", `${label} has a shared block with no selection.`, targetId));
      } else if (!sharedBlock) {
        issues.push(createIssue("error", "content", `${label} references missing shared block ${refId}.`, targetId));
      } else if (sharedBlock.block.type === BlockType.SHARED_BLOCK) {
        issues.push(createIssue("error", "content", `${label} references a nested shared block.`, targetId));
      }

      return;
    }

    if (block.type === BlockType.TWO_COLUMN) {
      const columns = Array.isArray(block.content?.columns) ? block.content.columns.slice(0, 2) : [];

      if (columns.length !== 2) {
        issues.push(createIssue("error", "content", `${label} two-column block must have exactly two columns.`, targetId));
      }

      columns.forEach((column: any, columnIndex: number) => {
        const nestedBlocks = Array.isArray(column?.blocks) ? column.blocks : [];
        const columnLabel = column?.label || `Column ${columnIndex + 1}`;

        if (nestedBlocks.length === 0) {
          issues.push(createIssue("warning", "content", `${label} ${columnLabel} is empty.`, targetId));
        }

        nestedBlocks.forEach((nestedBlock: BlockData) => {
          if (nestedBlock.type === BlockType.TWO_COLUMN) {
            issues.push(createIssue("error", "content", `${label} has a nested two-column block.`, targetId));
            return;
          }

          validateBlocks([nestedBlock], `${label} ${columnLabel}`, targetId, issues, graph);
        });
      });

      return;
    }

    if (block.type === BlockType.HERO && block.content?.bgImage) {
      validateImageReference(block.content.bgImage, `${label} hero image`, targetId, issues, graph);

      if (!hasText(block.content.imageAlt)) {
        issues.push(
          createIssue("warning", "assets", `${label} hero image is missing alt text.`, targetId),
        );
      }
    }

    if (block.type === BlockType.RENTAL_HERO && block.content?.imageUrl) {
      validateImageReference(block.content.imageUrl, `${label} rental hero image`, targetId, issues, graph);

      if (!hasText(block.content.imageAltText)) {
        issues.push(createIssue("warning", "assets", `${label} rental hero image is missing alt text.`, targetId));
      }

      const avatars = Array.isArray(block.content?.avatars) ? block.content.avatars : [];
      avatars.forEach((avatar: any, index: number) => {
        if (!avatar?.src) return;
        validateImageReference(avatar.src, `${label} rental avatar ${index + 1}`, targetId, issues, graph);

        if (!hasText(avatar.alt)) {
          issues.push(createIssue("warning", "assets", `${label} rental avatar ${index + 1} is missing alt text.`, targetId));
        }
      });
    }

    if (block.type === BlockType.RENTAL_ABOUT) {
      validateImageReference(block.content?.carImage, `${label} rental about car image`, targetId, issues, graph);
      const features = Array.isArray(block.content?.features) ? block.content.features : [];

      features.forEach((feature: any, index: number) => {
        validateImageReference(feature?.path, `${label} rental about feature ${index + 1} icon`, targetId, issues, graph);
      });
    }

    if (block.type === BlockType.RENTAL_CTA) {
      validateImageReference(block.content?.imageUrl, `${label} rental CTA image`, targetId, issues, graph);
    }

    if (block.type === BlockType.RENTAL_IMAGE_TEXT) {
      validateImageReference(block.content?.imageSrc, `${label} rental image/text image`, targetId, issues, graph);
    }

    if (block.type === BlockType.IMAGE_TEXT) {
      validateImageReference(block.content?.image, `${label} image/text image`, targetId, issues, graph);

      if (block.content?.image && !hasText(block.content.imageAlt)) {
        issues.push(createIssue("warning", "assets", `${label} image/text image is missing alt text.`, targetId));
      }
    }

    if (block.type === BlockType.RENTAL_FEATURES) {
      const features = Array.isArray(block.content?.features) ? block.content.features : [];

      features.forEach((feature: any, index: number) => {
        validateImageReference(feature?.path, `${label} rental feature ${index + 1} image`, targetId, issues, graph);
      });
    }

    if (block.type === BlockType.IMAGE_GALLERY) {
      const images = Array.isArray(block.content?.images) ? block.content.images : [];
      images.forEach((image: any, index: number) => {
        if (typeof image === "string") {
          validateImageReference(image, `${label} gallery image ${index + 1}`, targetId, issues, graph);
          issues.push(
            createIssue(
              "warning",
              "assets",
              `${label} gallery image ${index + 1} should use { src, alt }.`,
              targetId,
            ),
          );
        } else if (image?.src) {
          validateImageReference(image.src, `${label} gallery image ${index + 1}`, targetId, issues, graph);

          if (!hasText(image.alt)) {
            issues.push(
              createIssue(
                "warning",
                "assets",
                `${label} gallery image ${index + 1} is missing alt text.`,
                targetId,
              ),
            );
          }
        }
      });
    }
  });
};

export const validateContentGraph = (graph: ContentGraph): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const routeMap = new Map<string, string>();
  const pageSiblingSlugMap = new Map<string, string>();
  const pageSiblingNameMap = new Map<string, string>();
  const collectionRouteMap = new Map<string, string>();
  const categorySlugMap = new Map<string, string>();
  const entrySlugMap = new Map<string, string>();
  const entryNameMap = new Map<string, string>();
  const configuredLocales = getConfiguredLocales(graph.site);
  const localeCodes = new Set(configuredLocales.map((locale) => locale.code.toLowerCase()));
  const explicitLocales = graph.site.locales ?? [];

  if (
    explicitLocales.length > 0 &&
    !explicitLocales.some(
      (locale) =>
        locale.enabled !== false &&
        canonicalLocaleCode(locale.code).toLowerCase() === canonicalLocaleCode(graph.site.defaultLocale).toLowerCase(),
    )
  ) {
    issues.push(createIssue("error", "routing", "The default locale must be present and enabled in site.locales."));
  }

  const seenLocaleCodes = new Set<string>();
  const seenLocalePrefixes = new Map<string, string>();
  explicitLocales.forEach((locale) => {
    const code = canonicalLocaleCode(locale.code).toLowerCase();
    if (!hasText(locale.code) || !hasText(locale.label)) {
      issues.push(createIssue("error", "content", "Every configured locale needs a code and label."));
    }
    if (seenLocaleCodes.has(code)) {
      issues.push(createIssue("error", "content", `Locale "${locale.code}" is configured more than once.`));
    }
    seenLocaleCodes.add(code);

    if (locale.enabled !== false) {
      const prefix = getLocalePrefix(graph.site, locale.code).toLowerCase();
      if (prefix) {
        const previous = seenLocalePrefixes.get(prefix);
        if (previous) {
          issues.push(createIssue("error", "routing", `Locales "${previous}" and "${locale.code}" use the same path prefix "${prefix}".`));
        }
        seenLocalePrefixes.set(prefix, locale.code);
      }
    }
  });

  const localizedCollections = [
    { kind: "page", records: graph.pages },
    { kind: "entry", records: graph.entries },
    { kind: "collection", records: graph.collectionDefinitions },
    { kind: "category", records: graph.categories },
  ] as const;
  localizedCollections.forEach(({ kind, records }) => {
    const seenGroups = new Map<string, string>();
    records.forEach((record) => {
      const locale = getContentLocale(record, graph.site);
      if (!localeCodes.has(locale.toLowerCase())) {
        issues.push(createIssue("error", "content", `${kind} uses unconfigured locale "${locale}".`, record.id));
      }
      if (record.translationGroupId) {
        const key = `${record.translationGroupId}:${locale.toLowerCase()}`;
        const previous = seenGroups.get(key);
        if (previous) {
          issues.push(createIssue("error", "content", `Translation group "${record.translationGroupId}" has more than one ${kind} for locale "${locale}".`, record.id));
        }
        seenGroups.set(key, record.id);
      }
    });
  });

  if (!hasText(graph.site?.siteUrl)) {
    issues.push(createIssue("error", "seo", "Site URL is required."));
  } else {
    try {
      const siteUrl = new URL(graph.site.siteUrl);
      if (!["http:", "https:"].includes(siteUrl.protocol)) {
        issues.push(createIssue("error", "seo", "Site URL must use http or https."));
      }
    } catch {
      issues.push(createIssue("error", "seo", "Site URL must be a valid absolute URL."));
    }
  }

  if (!hasText(graph.site?.siteName)) {
    issues.push(createIssue("error", "seo", "Site name is required."));
  }

  validateAssetLibrary(graph, issues);
  validateImageReference(graph.site?.logo, "Site logo", "site", issues, graph);
  validateImageReference(graph.site?.defaultOgImage, "Default OpenGraph image", "site", issues, graph);
  validateImageReference(graph.site?.organization?.logo, "Organization logo", "site", issues, graph);

  graph.pages.forEach((page) => {
    const label = `Page "${page.title}"`;
    const locale = getContentLocale(page, graph.site);
    const siblingKey = `${locale}:${normalizeParentId(page.parentId)}`;
    const slugKey = `${siblingKey}:${normalizeComparable(page.slug)}`;
    const nameKey = `${siblingKey}:${normalizeComparable(page.title || page.name)}`;

    validateTemplateReference(page.templateId, "page", label, page.id, issues);

    if (!hasText(page.slug)) {
      issues.push(createIssue("error", "routing", `${label} is missing a slug.`, page.id));
    } else {
      const previousSlugPageId = pageSiblingSlugMap.get(slugKey);
      if (previousSlugPageId) {
        issues.push(
          createIssue(
            "error",
            "routing",
            `${label} uses the same slug as another page with the same parent.`,
            page.id,
          ),
        );
      }
      pageSiblingSlugMap.set(slugKey, page.id);
    }

    if (!hasText(page.title)) {
      issues.push(createIssue("error", "content", `${label} is missing a title.`, page.id));
    } else {
      const previousNamePageId = pageSiblingNameMap.get(nameKey);
      if (previousNamePageId) {
        issues.push(
          createIssue(
            "error",
            "content",
            `${label} uses the same name as another page with the same parent.`,
            page.id,
          ),
        );
      }
      pageSiblingNameMap.set(nameKey, page.id);
    }

    validateSeo(page.seo, label, page.id, issues);
    validateSeoImage(page.seo, label, page.id, issues, graph);
    validateBlocks(page.blocks, label, page.id, issues, graph);

    if (page.parentId && !graph.pages.some((candidate) => candidate.id === page.parentId)) {
      issues.push(createIssue("error", "routing", `${label} references a missing parent page.`, page.id));
    }

    const seen = new Set<string>();
    let current = page;
    while (current.parentId) {
      if (seen.has(current.id) || current.parentId === page.id) {
        issues.push(createIssue("error", "routing", `${label} has a circular parent page reference.`, page.id));
        break;
      }
      seen.add(current.id);
      const parent = graph.pages.find((candidate) => candidate.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
  });

  graph.collectionDefinitions.forEach((definition) => {
    const expectedSchema = expectedSchemaByPreset[definition.preset];
    const label = `Collection "${definition.name}"`;
    const normalizedSlug = normalizeRouteSegment(definition.slug);

    validateTemplateReference(definition.entryTemplateId, "entry", `${label} entry`, definition.id, issues);
    validateTemplateReference(definition.indexTemplateId, "collection", `${label} index`, definition.id, issues);

    if (!hasText(definition.slug)) {
      issues.push(createIssue("error", "routing", `${label} is missing a URL segment.`, definition.id));
    } else if (reservedRouteSegments.has(normalizedSlug)) {
      issues.push(createIssue("error", "routing", `${label} uses reserved URL segment "${normalizedSlug}".`, definition.id));
    } else {
      const routeKey = `${getContentLocale(definition, graph.site)}:${normalizeParentId(definition.routeParentId)}:${normalizedSlug}`;
      const previousDefinitionId = collectionRouteMap.get(routeKey);
      if (previousDefinitionId) {
        issues.push(
          createIssue(
            "error",
            "routing",
            `${label} uses the same route parent and URL segment as another collection.`,
            definition.id,
          ),
        );
      }
      collectionRouteMap.set(routeKey, definition.id);
    }

    const fieldKeyMap = new Map<string, string>();
    definition.fields.forEach((field) => {
      const fieldLabel = `Field "${field.label || field.id}" in ${label}`;
      const key = normalizeComparable(field.id);

      if (!hasText(field.id)) {
        issues.push(createIssue("error", "content", `${fieldLabel} is missing a stable key.`, definition.id));
      } else {
        const previousFieldId = fieldKeyMap.get(key);
        if (previousFieldId) {
          issues.push(createIssue("error", "content", `${label} has duplicate field key "${field.id}".`, definition.id));
        }
        fieldKeyMap.set(key, field.id);
      }

      if (!hasText(field.label)) {
        issues.push(createIssue("error", "content", `${fieldLabel} is missing a label.`, definition.id));
      }
    });

    if (expectedSchema && definition.schemaType !== expectedSchema) {
      issues.push(
        createIssue(
          "error",
          "seo",
          `${label} must use ${expectedSchema} schema for its preset.`,
          definition.id,
        ),
      );
    }

    if (
      definition.routeParentId &&
      !graph.pages.some((page) => page.id === definition.routeParentId)
    ) {
      issues.push(
        createIssue(
          "error",
          "routing",
          `${label} references a missing route parent page.`,
          definition.id,
        ),
      );
    }

    if (definition.publicIndex) {
      validateSeo(definition.seo, label, definition.id, issues);
      validateSeoImage(definition.seo, label, definition.id, issues, graph);

      if (getCollectionEntries(definition, graph).length === 0) {
        issues.push(
          createIssue(
            "warning",
            "content",
            `${label} has a public index page but no published entries.`,
            definition.id,
          ),
        );
      }
    }

    definition.categoryIds.forEach((categoryId) => {
      if (!graph.categories.some((category) => category.id === categoryId)) {
        issues.push(
          createIssue(
            "error",
            "content",
            `${label} references missing category ${categoryId}.`,
            definition.id,
          ),
        );
      }
    });
  });

  graph.entries.forEach((entry) => {
    const definition = graph.collectionDefinitions.find(
      (candidate) => candidate.id === entry.collectionId,
    );
    const label = `Entry "${entry.title}"`;

    validateTemplateReference(entry.templateId, "entry", label, entry.id, issues);

    if (!definition) {
      issues.push(createIssue("error", "content", `${label} references a missing collection.`, entry.id));
    }

    if (!hasText(entry.slug)) {
      issues.push(createIssue("error", "routing", `${label} is missing a slug.`, entry.id));
    } else {
      const slugKey = `${getContentLocale(entry, graph.site)}:${entry.collectionId}:${normalizeComparable(entry.slug)}`;
      const previousEntryId = entrySlugMap.get(slugKey);
      if (previousEntryId) {
        issues.push(
          createIssue(
            "error",
            "routing",
            `${label} uses the same slug as another entry in this collection.`,
            entry.id,
          ),
        );
      }
      entrySlugMap.set(slugKey, entry.id);
    }

    if (!hasText(entry.title)) {
      issues.push(createIssue("error", "content", `${label} is missing a title.`, entry.id));
    } else {
      const nameKey = `${getContentLocale(entry, graph.site)}:${entry.collectionId}:${normalizeComparable(entry.title)}`;
      const previousEntryId = entryNameMap.get(nameKey);
      if (previousEntryId) {
        issues.push(
          createIssue(
            "error",
            "content",
            `${label} uses the same name as another entry in this collection.`,
            entry.id,
          ),
        );
      }
      entryNameMap.set(nameKey, entry.id);
    }

    entry.categoryIds.forEach((categoryId) => {
      if (!graph.categories.some((category) => category.id === categoryId)) {
        issues.push(createIssue("error", "content", `${label} references missing category ${categoryId}.`, entry.id));
      }
    });

    definition?.fields
      .filter((field) => field.required)
      .forEach((field) => {
        if (!hasText(String(entry.fields?.[field.id] ?? ""))) {
          issues.push(
            createIssue(
              "error",
              "content",
              `${label} is missing required field "${field.label}".`,
              entry.id,
            ),
          );
        }
      });

    definition?.fields
      .filter((field) => field.type === "image")
      .forEach((field) => {
        validateImageReference(
          entry.fields?.[field.id],
          `${label} field "${field.label}"`,
          entry.id,
          issues,
          graph,
        );
      });

    validateSeo(entry.seo, label, entry.id, issues);
    validateSeoImage(entry.seo, label, entry.id, issues, graph);

    const bodyField = entry.fields?.body ?? entry.fields?.content;
    const hasBodyField =
      (typeof bodyField === "string" && hasText(bodyField)) ||
      (Boolean(bodyField) && typeof bodyField === "object" && Array.isArray((bodyField as any).content));

    if (entry.blocks.length > 0 || (!hasBodyField && definition?.hasBlocks !== false)) {
      validateBlocks(entry.blocks, label, entry.id, issues, graph);
    }
  });

  graph.sharedBlocks.forEach((sharedBlock) => {
    const label = `Shared block "${sharedBlock.name}"`;

    if (!hasText(sharedBlock.name)) {
      issues.push(createIssue("error", "content", "A shared block is missing a name.", sharedBlock.id));
    }

    if (sharedBlock.block.type === BlockType.SHARED_BLOCK) {
      issues.push(createIssue("error", "content", `${label} cannot reference another shared block.`, sharedBlock.id));
      return;
    }

    validateBlocks([sharedBlock.block], label, sharedBlock.id, issues, graph);
  });

  graph.categories.forEach((category) => {
    const label = `Category "${category.name}"`;
    const normalizedSlug = normalizeRouteSegment(category.slug);

    validateTemplateReference(category.indexTemplateId, "category", `${label} index`, category.id, issues);

    if (!hasText(category.slug)) {
      issues.push(createIssue("error", "routing", `${label} is missing a slug.`, category.id));
    } else if (reservedRouteSegments.has(normalizedSlug)) {
      issues.push(createIssue("error", "routing", `${label} uses reserved slug "${normalizedSlug}".`, category.id));
    } else {
      const categoryKey = `${getContentLocale(category, graph.site)}:${normalizedSlug}`;
      const previousCategoryId = categorySlugMap.get(categoryKey);
      if (previousCategoryId) {
        issues.push(createIssue("error", "routing", `${label} uses the same slug as another category.`, category.id));
      }
      categorySlugMap.set(categoryKey, category.id);
    }

    if (category.publicIndex) {
      validateSeo(category.seo, label, category.id, issues);
      validateSeoImage(category.seo, label, category.id, issues, graph);

      if (getCategoryEntries(category, graph).length === 0) {
        issues.push(
          createIssue(
            "warning",
            "content",
            `${label} has a public page but no published entries.`,
            category.id,
          ),
        );
      }
    }

    category.collectionIds.forEach((collectionId) => {
      if (!graph.collectionDefinitions.some((definition) => definition.id === collectionId)) {
        issues.push(
          createIssue(
            "error",
            "content",
            `${label} references missing collection ${collectionId}.`,
            category.id,
          ),
        );
      }
    });
  });

  getPublicRouteRecords(graph).forEach((route) => {
    const previous = routeMap.get(route.path);
    if (previous) {
      issues.push(
        createIssue(
          "error",
          "routing",
          `Duplicate public route "${route.path}" used by ${previous} and ${route.id}.`,
          route.id,
        ),
      );
    }
    routeMap.set(route.path, route.id);
  });

  const validateNavigationItems = (items: NavigationItem[]) => {
    items.forEach((item) => {
      if (!hasText(item.label)) {
        issues.push(createIssue("error", "routing", "A navigation item is missing a label.", item.id));
      }

      if (item.targetType === "url" && !hasText(item.href)) {
        issues.push(createIssue("error", "routing", `Navigation item "${item.label}" needs a URL.`, item.id));
      }

      if (item.targetType === "page" && !graph.pages.some((page) => page.id === item.targetId)) {
        issues.push(createIssue("error", "routing", `Navigation item "${item.label}" points to a missing page.`, item.id));
      }

      if (item.targetType === "entry" && !graph.entries.some((entry) => entry.id === item.targetId)) {
        issues.push(createIssue("error", "routing", `Navigation item "${item.label}" points to a missing entry.`, item.id));
      }

      if (item.targetType === "collection") {
        const definition = graph.collectionDefinitions.find((candidate) => candidate.id === item.targetId);
        if (!definition) {
          issues.push(createIssue("error", "routing", `Navigation item "${item.label}" points to a missing collection.`, item.id));
        } else if (!definition.publicIndex) {
          issues.push(
            createIssue(
              "warning",
              "routing",
              `Navigation item "${item.label}" points to a collection without a public index page.`,
              item.id,
            ),
          );
        }
      }

      if (item.targetType === "category") {
        const category = graph.categories.find((candidate) => candidate.id === item.targetId);
        if (!category) {
          issues.push(createIssue("error", "routing", `Navigation item "${item.label}" points to a missing category.`, item.id));
        } else if (!category.publicIndex) {
          issues.push(
            createIssue(
              "warning",
              "routing",
              `Navigation item "${item.label}" points to a category without a public page.`,
              item.id,
            ),
          );
        }
      }

      if (item.children?.length) validateNavigationItems(item.children);
    });
  };

  graph.navigation.forEach((menu) => {
    validateNavigationItems(menu.items);
  });

  graph.redirects.forEach((rule) => {
    if (!hasText(rule.from) || !hasText(rule.to)) {
      issues.push(createIssue("error", "routing", `Redirect ${rule.id} needs both from and to paths.`, rule.id));
    }

    if (![301, 302].includes(rule.status)) {
      issues.push(createIssue("error", "routing", `Redirect ${rule.id} must use status 301 or 302.`, rule.id));
    }

    if (rule.from === rule.to) {
      issues.push(createIssue("error", "routing", `Redirect ${rule.id} points to itself.`, rule.id));
    }
  });

  const publicIds = new Set([
    ...graph.pages.map((page) => page.id),
    ...graph.collectionDefinitions.map((definition) => definition.id),
    ...graph.entries.map((entry) => entry.id),
    ...graph.categories.map((category) => category.id),
  ]);

  [...graph.pages, ...graph.entries].forEach((item) => {
    collectTextFromUnknown(item.blocks).forEach((text) => {
      const match = text.match(/content:([a-z0-9-_]+)/i);
      if (match && !publicIds.has(match[1])) {
        issues.push(
          createIssue(
            "error",
            "routing",
            `"${item.title}" links to missing internal content ${match[1]}.`,
            item.id,
          ),
        );
      }
    });
  });

  // Touch route helpers here so path logic is exercised during validation.
  graph.pages.forEach((page) => getPagePath(page, graph));
  graph.entries.forEach((entry) =>
    getEntryPath(
      entry,
      graph.collectionDefinitions.find((definition) => definition.id === entry.collectionId),
      graph,
    ),
  );
  graph.collectionDefinitions.forEach((definition) => getCollectionPath(definition, graph));
  graph.categories.forEach((category) => getCategoryPath(category, graph));

  return issues;
};
