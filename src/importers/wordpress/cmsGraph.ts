import type {
  Category,
  CollectionDefinition,
  CollectionEntry,
  ContentGraph,
  NavigationItem,
  PageContent,
  SEOData,
} from "../../../types";
import { BlockType } from "../../../types";
import { inferLocaleDirection } from "../../localization/registry";
import type { WordPressGraphInput, WordPressMigrationProfile } from "./profile";
import type { NormalizedWordPressDocument, WordPressLocalizationManifest, WordPressSiteAudit } from "./types";

const categoryId = (id: number) => `wp-category-${id}`;
const pageId = (id: number) => `wp-page-${id}`;
const entryId = (id: number) => `wp-post-${id}`;

const titleCase = (value: string) =>
  value
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const siteNameFromUrl = (siteUrl: string) => {
  try {
    return titleCase(new URL(siteUrl).hostname.replace(/^www\./, "").split(".")[0] || "Website");
  } catch {
    return "Website";
  }
};

const seoFor = (document: NormalizedWordPressDocument, schemaType: "Article" | "WebPage"): SEOData => ({
  title: String(document.seo.title || document.title),
  description: String(document.seo.description || document.excerpt || document.title),
  ogImage: String(document.seo.ogImage || document.linkedMedia[0]?.sourceUrl || ""),
  canonical: String(document.seo.canonical || document.source.sourceUrl),
  robots: document.seo.robots === "noindex,follow" || document.seo.robots === "noindex,nofollow"
    ? document.seo.robots
    : "index,follow",
  ogTitle: String(document.seo.ogTitle || document.seo.title || document.title),
  ogDescription: String(document.seo.ogDescription || document.seo.description || document.excerpt || document.title),
  twitterCard: document.seo.twitterCard === "summary" ? "summary" : "summary_large_image",
  schemaType,
});

const blockData = (document: NormalizedWordPressDocument) =>
  document.blocks.map((block) => ({
    id: block.id,
    type: block.type as BlockType,
    content: block.content,
  }));

const readableText = (value: unknown, key = ""): string => {
  if (typeof value === "string") {
    return ["text", "title", "body", "caption", "excerpt"].includes(key) ? value : "";
  }
  if (Array.isArray(value)) return value.map((item) => readableText(item)).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.entries(value).map(([childKey, child]) => readableText(child, childKey)).join(" ");
};

const categoryPaths = (audit: WordPressSiteAudit) => {
  const routes = audit.routes.filter((route) => route.kind === "category");
  const byId = new Map(routes.map((route) => [route.id, route]));
  const resolvePath = (route: (typeof routes)[number], seen = new Set<number>()): string => {
    if (!route.parentId || seen.has(route.id)) return route.slug;
    const parent = byId.get(route.parentId);
    if (!parent) return route.slug;
    seen.add(route.id);
    return `${resolvePath(parent, seen)}/${route.slug}`;
  };
  return new Map(routes.map((route) => [route.id, resolvePath(route)]));
};

const localeSegment = (locale?: string) => locale?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "default";
const collectionIdFor = (locale: string | undefined, multilingual: boolean) =>
  multilingual ? `collection-articles-${localeSegment(locale)}` : "collection-articles";

const buildCategories = (audit: WordPressSiteAudit, now: string, multilingual: boolean): Category[] => {
  const paths = categoryPaths(audit);
  return audit.routes
    .filter((route) => route.kind === "category")
    .map((route) => ({
      id: categoryId(route.id),
      locale: route.locale,
      path: (() => {
        try {
          return new URL(route.url).pathname;
        } catch {
          return undefined;
        }
      })(),
      name: route.title || titleCase(route.slug),
      slug: paths.get(route.id) || route.slug,
      parentId: route.parentId ? categoryId(route.parentId) : null,
      description: `Browse content filed under ${route.title || titleCase(route.slug)}.`,
      indexTemplateId: "category-index",
      publicIndex: true,
      collectionIds: [collectionIdFor(route.locale, multilingual)],
      seo: {
        title: route.title || titleCase(route.slug),
        description: `Browse content filed under ${route.title || titleCase(route.slug)}.`,
        ogImage: "",
        robots: "index,follow",
        twitterCard: "summary_large_image",
        schemaType: "CollectionPage",
      },
      updatedAt: now,
    }));
};

const buildEntries = (documents: NormalizedWordPressDocument[], multilingual: boolean): CollectionEntry[] =>
  documents
    .filter((document) => document.kind === "post")
    .map((document) => {
      const featured = document.linkedMedia.find((media) => media.sourceElement === "featured-media");
      const wordCount = readableText(document.blocks).trim().split(/\s+/).filter(Boolean).length;
      return {
        id: entryId(document.source.entityId),
        locale: document.locale,
        translationGroupId: document.translationGroupId,
        path: document.path,
        kind: "collectionEntry",
        collectionId: collectionIdFor(document.locale, multilingual),
        title: document.title,
        slug: document.slug,
        status: document.status,
        templateId: "article-standard",
        seo: seoFor(document, "Article"),
        blocks: blockData(document),
        updatedAt: document.updatedAt,
        excerpt: document.excerpt,
        author: document.author,
        publishedAt: document.publishedAt,
        categoryIds: document.categoryIds,
        fields: {
          featuredImage: featured?.sourceUrl || document.seo.ogImage || "",
          featuredImageAlt: featured?.alt || document.title,
          sourceUrl: document.source.sourceUrl,
          sourceId: document.source.entityId,
          tagIds: document.tagIds,
          authorName: document.author,
          readingTime: `${Math.max(1, Math.ceil(wordCount / 220))} min read`,
        },
      };
    });

const pagePath = (audit: WordPressSiteAudit, document: NormalizedWordPressDocument) => {
  const route = audit.routes.find((candidate) => candidate.kind === "page" && candidate.id === document.source.entityId);
  try {
    const pathname = new URL(route?.url || document.source.sourceUrl).pathname;
    return pathname === "/" ? "/" : pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    return document.slug;
  }
};

const buildPages = (
  documents: NormalizedWordPressDocument[],
  audit: WordPressSiteAudit,
  siteName: string,
  now: string,
  localization: WordPressLocalizationManifest | undefined,
  multilingual: boolean,
): PageContent[] => {
  const routeById = new Map(audit.routes.filter((route) => route.kind === "page").map((route) => [route.id, route]));
  const pages = documents
    .filter((document) => document.kind === "page")
    .map((document, index): PageContent => {
      const route = routeById.get(document.source.entityId);
      return {
        id: pageId(document.source.entityId),
        locale: document.locale,
        translationGroupId: document.translationGroupId,
        path: document.path,
        kind: "page",
        name: document.title,
        title: document.title,
        slug: document.path === "/" ? "/" : document.slug || pagePath(audit, document),
        status: document.status,
        templateId: "landing-page",
        seo: seoFor(document, "WebPage"),
        blocks: blockData(document),
        updatedAt: document.updatedAt,
        parentId: route?.parentId ? pageId(route.parentId) : null,
        order: index + 1,
        showInNavigation: false,
        navigationLabel: document.title,
      };
    });

  const routeLocales = audit.routes.map((route) => route.locale).filter((locale): locale is string => Boolean(locale));
  const localeHomes = localization?.locales.map((locale) => ({
    locale: locale.code as string | undefined,
    path: (() => {
      try {
        return new URL(locale.url).pathname || "/";
      } catch {
        return locale.isDefault ? "/" : `/${localeSegment(locale.code)}/`;
      }
    })(),
  })) ?? [...new Set(routeLocales.length ? routeLocales : [undefined])].map((locale) => ({
    locale,
    path: locale ? `/${localeSegment(locale)}/` : "/",
  }));
  localeHomes.forEach(({ locale, path: homePath }) => {
    const normalizedHomePath = homePath === "/"
      ? "/"
      : `/${homePath.replace(/^\/+|\/+$/g, "")}/`;
    if (pages.some((page) => page.locale === locale && page.path === normalizedHomePath)) return;
    pages.unshift({
      id: locale ? `page-home-${localeSegment(locale)}` : "page-home",
      locale,
      translationGroupId: "wordpress-homepage",
      kind: "page",
      name: "Homepage",
      title: siteName,
      slug: "/",
      path: normalizedHomePath,
      status: "published",
      templateId: "landing-page",
      seo: {
        title: siteName,
        description: `Latest content from ${siteName}.`,
        ogImage: "",
        robots: "index,follow",
        twitterCard: "summary_large_image",
        schemaType: "WebPage",
      },
      blocks: [{
        id: `wordpress-home-articles-${localeSegment(locale)}`,
        type: BlockType.BLOG_GRID,
        content: {
          title: "Latest articles",
          collectionId: collectionIdFor(locale, multilingual),
          layout: "grid",
          maxItems: 12,
        },
      }],
      updatedAt: now,
      parentId: null,
      order: 0,
      showInNavigation: true,
      navigationLabel: "Home",
    });
  });
  return pages;
};

const buildNavigation = (pages: PageContent[]) => {
  const pageItem = (page: PageContent): NavigationItem => ({
    id: `nav-${page.id}`,
    label: page.navigationLabel || page.title,
    targetType: "page",
    targetId: page.id,
  });
  const utilitySlugs = new Set(["about", "contact", "privacy-policy", "cookie-policy", "terms", "terms-and-conditions"]);
  const locales = [...new Set(pages.map((page) => page.locale))];
  return locales.flatMap((locale) => {
    const topLevel = pages.filter((page) => page.locale === locale && !page.parentId && page.slug !== "/");
    const headerPages = topLevel.filter((page) => !utilitySlugs.has(page.slug)).slice(0, 6);
    const footerPages = topLevel.filter((page) => utilitySlugs.has(page.slug));
    const suffix = locale ? `-${localeSegment(locale)}` : "";
    return [
      { id: `nav-header${suffix}`, name: "Header", location: "header" as const, locale, translationGroupId: "wordpress-header", items: headerPages.map(pageItem) },
      { id: `nav-footer${suffix}`, name: "Footer", location: "footer" as const, locale, translationGroupId: "wordpress-footer", items: footerPages.map(pageItem) },
    ];
  });
};

const articleCollection = (categories: Category[], now: string, locale?: string, multilingual = false): CollectionDefinition => ({
  id: collectionIdFor(locale, multilingual),
  locale,
  translationGroupId: "wordpress-articles",
  name: "Articles",
  singularName: "Article",
  routeParentId: null,
  slug: "",
  description: "WordPress posts imported as editable articles.",
  preset: "article",
  schemaType: "Article",
  entryTemplateId: "article-standard",
  indexTemplateId: "blog-index",
  hasBlocks: true,
  publicIndex: false,
  seo: {
    title: "Articles",
    description: "Browse the latest articles.",
    ogImage: "",
    robots: "index,follow",
    twitterCard: "summary_large_image",
    schemaType: "CollectionPage",
  },
  fields: [
    { id: "featuredImage", label: "Featured Image", type: "image", required: false },
    { id: "featuredImageAlt", label: "Featured Image Alt", type: "text", required: false },
    { id: "sourceUrl", label: "Original URL", type: "url", required: false },
    { id: "sourceId", label: "WordPress ID", type: "number", required: false },
  ],
  categoryIds: categories.filter((category) => category.locale === locale).map((category) => category.id),
  updatedAt: now,
});

export function buildGenericWordPressContentGraph({ audit, documents, localization }: WordPressGraphInput): ContentGraph {
  const now = new Date().toISOString();
  const siteName = siteNameFromUrl(audit.siteUrl);
  const defaultLocale = localization?.defaultLocale;
  const localizedDocuments = defaultLocale
    ? documents.map((document) => ({ ...document, locale: document.locale ?? defaultLocale }))
    : documents;
  const localizedAudit = defaultLocale
    ? { ...audit, routes: audit.routes.map((route) => ({ ...route, locale: route.locale ?? defaultLocale })) }
    : audit;
  const localeCodes = localization?.locales.map((locale) => locale.code)
    ?? [...new Set(localizedDocuments.map((document) => document.locale).filter((locale): locale is string => Boolean(locale)))];
  const multilingual = localeCodes.length > 1;
  const categories = buildCategories(localizedAudit, now, multilingual);
  const entries = buildEntries(localizedDocuments, multilingual);
  const pages = buildPages(localizedDocuments, localizedAudit, siteName, now, localization, multilingual);
  const latestImage = entries.find((entry) => entry.fields.featuredImage)?.fields.featuredImage || "";

  return {
    version: 1,
    updatedAt: now,
    site: {
      siteName,
      siteUrl: audit.siteUrl,
      starterId: "blank",
      enabledPacks: ["core"],
      editorMode: "builder",
      logo: "",
      favicon: "/favicon.ico",
      defaultLocale: localization?.defaultLocale ?? localeCodes[0] ?? "en-US",
      locales: localization?.locales.map((locale) => ({
        code: locale.code,
        label: locale.code,
        hreflang: locale.hreflang,
        pathPrefix: locale.pathPrefix,
        direction: inferLocaleDirection(locale.code),
        enabled: true,
      })),
      localeRouting: { strategy: "prefix-except-default" },
      defaultTitlePattern: `%s | ${siteName}`,
      defaultDescription: `Content migrated from ${audit.siteUrl}.`,
      defaultOgImage: latestImage,
      design: {
        themeId: "clean-saas",
        primaryColor: "#2563eb",
        accentColor: "#7c3aed",
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        headingFont: "Inter",
        bodyFont: "Inter",
        radius: "md",
      },
      enabledFeatures: { contentModels: true, mediaLibrary: true, sharedBlocks: true },
      organization: { name: siteName, sameAs: [] },
      socialProfiles: [],
    },
    pages,
    collectionDefinitions: (localeCodes.length ? localeCodes : [undefined]).map((locale) =>
      articleCollection(categories, now, locale, multilingual),
    ),
    entries,
    categories,
    sharedBlocks: [],
    navigation: buildNavigation(pages),
    assets: [],
    redirects: [],
    customBlueprints: [],
    blueprintAssignments: [],
  };
}

export function buildWordPressContentGraph(
  input: WordPressGraphInput,
  profile?: WordPressMigrationProfile,
): ContentGraph {
  return profile ? profile.buildGraph(input) : buildGenericWordPressContentGraph(input);
}
