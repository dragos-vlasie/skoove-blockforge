import { createHash } from "node:crypto";
import type { Root } from "hast";
import { toText } from "hast-util-to-text";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { parseWordPressHtml } from "./html";
import type {
  LinkedMedia,
  MigrationIssue,
  NormalizedWordPressDocument,
  WordPressEntity,
  WordPressEntityKind,
  WordPressMedia,
  WordPressTerm,
  WordPressUser,
} from "./types";

const parser = unified().use(rehypeParse, { fragment: true });

export type NormalizeWordPressEntityOptions = {
  entity: WordPressEntity;
  kind: WordPressEntityKind;
  siteUrl: string;
  author?: WordPressUser | null;
  featuredMedia?: WordPressMedia | null;
  categories?: WordPressTerm[];
  tags?: WordPressTerm[];
  locale?: string;
  translationGroupId?: string;
};

const plainText = (html: unknown) => {
  const source = typeof html === "string" ? html : "";
  if (!source) return "";
  return toText(parser.parse(source) as Root, { whitespace: "normal" }).replace(/\u00a0/g, " ").trim();
};

const isoDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
};

const stableId = (prefix: string, value: string | number) =>
  `${prefix}-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

const checksum = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const yoastSeo = (entity: WordPressEntity, title: string, excerpt: string) => {
  const yoast = entity.yoast_head_json ?? {};
  const image = Array.isArray(yoast.og_image) ? yoast.og_image[0]?.url : "";
  const robotsIndex = yoast.robots?.index;
  const robotsFollow = yoast.robots?.follow;
  return {
    title: yoast.title || title,
    description: yoast.description || excerpt,
    canonical: yoast.canonical || entity.link || "",
    ogTitle: yoast.og_title || yoast.title || title,
    ogDescription: yoast.og_description || yoast.description || excerpt,
    ogImage: image || entity.jetpack_featured_media_url || "",
    twitterCard: yoast.twitter_card === "summary" ? "summary" : "summary_large_image",
    robots: `${robotsIndex === "noindex" ? "noindex" : "index"},${robotsFollow === "nofollow" ? "nofollow" : "follow"}`,
    schemaType: entity.type === "post" ? "Article" : "WebPage",
    sourceSchema: yoast.schema ?? null,
  };
};

const featuredMediaReference = (media: WordPressMedia | null | undefined, title: string): LinkedMedia | null => {
  if (!media?.source_url) return null;
  return {
    sourceUrl: media.source_url,
    alt: media.alt_text || plainText(media.title?.rendered) || title,
    caption: plainText(media.caption?.rendered),
    width: media.media_details?.width,
    height: media.media_details?.height,
    sourceAttachmentId: media.id,
    sourceElement: "featured-media",
  };
};

export function normalizeWordPressEntity({
  entity,
  kind,
  siteUrl,
  author,
  featuredMedia,
  categories = [],
  tags = [],
  locale,
  translationGroupId,
}: NormalizeWordPressEntityOptions): NormalizedWordPressDocument {
  const title = plainText(entity.title?.rendered) || `WordPress ${kind} ${entity.id}`;
  const excerpt = plainText(entity.excerpt?.rendered);
  const sourceUrl = entity.link || `${siteUrl.replace(/\/$/, "")}/${entity.slug}/`;
  const sourcePath = (() => {
    try {
      return new URL(sourceUrl).pathname;
    } catch {
      return `/${entity.slug}/`;
    }
  })();
  const source = {
    platform: "wordpress" as const,
    siteUrl: siteUrl.replace(/\/$/, ""),
    entityKind: kind,
    entityId: entity.id,
    sourceUrl,
    sourceModified: entity.modified,
  };
  const sourceHtml = entity.content?.raw || entity.content?.rendered || "";
  const parsed = parseWordPressHtml({ html: sourceHtml, source });
  const leadingMedia = featuredMediaReference(featuredMedia, title);
  const linkedMedia = leadingMedia
    ? [leadingMedia, ...parsed.linkedMedia.filter((media) => media.sourceUrl !== leadingMedia.sourceUrl)]
    : parsed.linkedMedia;
  const issues: MigrationIssue[] = [...parsed.issues];

  if (!entity.content?.raw) {
    issues.unshift({
      code: "source.raw-content-unavailable",
      severity: "info",
      message: "The public API exposed rendered HTML. Authenticated context=edit or WXR improves Gutenberg block-boundary fidelity.",
    });
  }
  if (!parsed.blocks.length && sourceHtml.trim()) {
    issues.push({
      code: "document.no-editable-blocks",
      severity: "blocking",
      message: "The source contained content, but no editable CMS blocks were produced.",
    });
  }

  return {
    schemaVersion: 1,
    id: stableId(`wp-${kind}`, entity.id),
    kind,
    title,
    slug: entity.slug,
    locale,
    translationGroupId,
    path: sourcePath,
    status: entity.status === "publish" ? "published" : "draft",
    templateId: kind === "post" ? "article-standard" : "landing-page",
    excerpt,
    author: author?.name || "WordPress Author",
    publishedAt: isoDate(entity.date_gmt || entity.date),
    updatedAt: isoDate(entity.modified_gmt || entity.modified) || new Date().toISOString(),
    categoryIds: categories.map((category) => stableId("wp-category", category.id)),
    tagIds: tags.map((tag) => stableId("wp-tag", tag.id)),
    seo: yoastSeo(entity, title, excerpt),
    blocks: parsed.blocks,
    linkedMedia,
    links: parsed.links,
    issues,
    styleInventory: parsed.styleInventory,
    stats: parsed.stats,
    source: {
      ...source,
      checksum: checksum({
        title: entity.title,
        content: entity.content,
        excerpt: entity.excerpt,
        modified: entity.modified,
        categories: entity.categories,
        tags: entity.tags,
      }),
      rawContentAvailable: Boolean(entity.content?.raw),
    },
  };
}

export function resolveEmbeddedEntityData(entity: WordPressEntity) {
  const author = entity._embedded?.author?.[0] as WordPressUser | undefined;
  const featuredMedia = entity._embedded?.["wp:featuredmedia"]?.[0] as WordPressMedia | undefined;
  const terms = (entity._embedded?.["wp:term"] ?? []).flat() as WordPressTerm[];
  return {
    author,
    featuredMedia,
    categories: terms.filter((term) => term.taxonomy === "category"),
    tags: terms.filter((term) => term.taxonomy === "post_tag"),
  };
}
