import {
  Category,
  CollectionDefinition,
  CollectionEntry,
  ContentGraph,
  NavigationItem,
  PageContent,
} from "../../../types";
import { applyLocalePrefix, getContentLocale } from "../../localization/registry";
import { isIndexableSeo } from "./seo";

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

export const normalizeSlug = (slug: string) => {
  const cleaned = trimSlashes((slug || "").trim().toLowerCase());
  return cleaned || "/";
};

export const withLeadingSlash = (path: string) => {
  const normalized = trimSlashes(path);
  return normalized ? `/${normalized}` : "/";
};

export const withTrailingSlash = (path: string) => {
  const leading = withLeadingSlash(path);
  return leading === "/" ? leading : `${leading}/`;
};

const pageRouteSegments = (
  page: PageContent,
  graph: ContentGraph,
  visitedPageIds = new Set<string>(),
): string[] => {
  const slug = normalizeSlug(page.slug);
  if (slug === "/") return [];
  if (visitedPageIds.has(page.id) || !page.parentId) return [trimSlashes(slug)];

  const parent = graph.pages.find((candidate) => candidate.id === page.parentId);
  if (!parent) return [trimSlashes(slug)];

  visitedPageIds.add(page.id);
  return [...pageRouteSegments(parent, graph, visitedPageIds), trimSlashes(slug)].filter(Boolean);
};

export const getPagePath = (
  page: PageContent,
  graph: ContentGraph,
  visitedPageIds = new Set<string>(),
): string => {
  if (page.path) return withTrailingSlash(page.path);
  return applyLocalePrefix(
    pageRouteSegments(page, graph, visitedPageIds).join("/"),
    graph.site,
    getContentLocale(page, graph.site),
  );
};

const collectionRouteSegments = (definition: CollectionDefinition, graph?: ContentGraph) => {
  const segments: string[] = [];

  if (definition.routeParentId && graph) {
    const parent = graph.pages.find((candidate) => candidate.id === definition.routeParentId);
    if (parent) segments.push(...pageRouteSegments(parent, graph));
  }

  const collectionSegment = trimSlashes(definition.slug);
  if (collectionSegment) segments.push(collectionSegment);
  return segments;
};

export const getEntryPath = (
  entry: CollectionEntry,
  definition?: CollectionDefinition,
  graph?: ContentGraph,
): string => {
  if (entry.path) return withTrailingSlash(entry.path);

  const entrySegment = trimSlashes(entry.slug);
  if (definition?.path) return withTrailingSlash(`${trimSlashes(definition.path)}/${entrySegment}`);

  const segments = definition ? collectionRouteSegments(definition, graph) : [];
  if (entrySegment) segments.push(entrySegment);
  if (!graph) return withTrailingSlash(segments.join("/"));

  return applyLocalePrefix(
    segments.join("/"),
    graph.site,
    getContentLocale(entry, graph.site),
  );
};

export const getCollectionPath = (
  definition: CollectionDefinition,
  graph?: ContentGraph,
): string => {
  if (definition.path) return withTrailingSlash(definition.path);
  const segments = collectionRouteSegments(definition, graph);
  if (!graph) return withTrailingSlash(segments.join("/"));

  return applyLocalePrefix(
    segments.join("/"),
    graph.site,
    getContentLocale(definition, graph.site),
  );
};

export const getCategoryPath = (category: Category, graph?: ContentGraph): string => {
  if (category.path) return withTrailingSlash(category.path);
  const basePath = graph?.site.localeRouting?.categoryBasePath ?? "category";
  const route = `${trimSlashes(basePath)}/${trimSlashes(category.slug)}`;
  if (!graph) return withTrailingSlash(route);
  return applyLocalePrefix(route, graph.site, getContentLocale(category, graph.site));
};

export const resolveNavigationHref = (item: NavigationItem, graph: ContentGraph): string => {
  if (item.targetType === "url") return item.href || "#";

  if (item.targetType === "page" && item.targetId) {
    const page = graph.pages.find((candidate) => candidate.id === item.targetId);
    return page ? getPagePath(page, graph) : "#";
  }

  if (item.targetType === "entry" && item.targetId) {
    const entry = graph.entries.find((candidate) => candidate.id === item.targetId);
    const definition = graph.collectionDefinitions.find(
      (candidate) => candidate.id === entry?.collectionId,
    );
    return entry ? getEntryPath(entry, definition, graph) : "#";
  }

  if (item.targetType === "collection" && item.targetId) {
    const definition = graph.collectionDefinitions.find((candidate) => candidate.id === item.targetId);
    return definition ? getCollectionPath(definition, graph) : "#";
  }

  if (item.targetType === "category" && item.targetId) {
    const category = graph.categories.find((candidate) => candidate.id === item.targetId);
    return category ? getCategoryPath(category, graph) : "#";
  }

  return "#";
};

const matchesLocale = (record: { locale?: string }, graph: ContentGraph, locale?: string) =>
  !locale || getContentLocale(record, graph.site).toLowerCase() === locale.toLowerCase();

export const getPublishedPages = (graph: ContentGraph, locale?: string) =>
  graph.pages.filter((page) => page.status === "published" && matchesLocale(page, graph, locale));

export const getPublishedEntries = (graph: ContentGraph, locale?: string) =>
  graph.entries.filter((entry) => entry.status === "published" && matchesLocale(entry, graph, locale));

export const getPublicCollections = (graph: ContentGraph, locale?: string) =>
  graph.collectionDefinitions.filter(
    (definition) => definition.publicIndex && matchesLocale(definition, graph, locale),
  );

export const getCollectionEntries = (definition: CollectionDefinition, graph: ContentGraph) => {
  const locale = getContentLocale(definition, graph.site);
  return getPublishedEntries(graph, locale).filter((entry) => entry.collectionId === definition.id);
};

export const getPublicCategories = (graph: ContentGraph, locale?: string) =>
  graph.categories.filter((category) => category.publicIndex && matchesLocale(category, graph, locale));

export const getCategoryEntries = (category: Category, graph: ContentGraph) => {
  const locale = getContentLocale(category, graph.site);
  const categoryIds = new Set<string>([category.id]);
  let addedDescendant = true;

  while (addedDescendant) {
    addedDescendant = false;
    graph.categories.forEach((candidate) => {
      if (
        matchesLocale(candidate, graph, locale) &&
        candidate.parentId &&
        categoryIds.has(candidate.parentId) &&
        !categoryIds.has(candidate.id)
      ) {
        categoryIds.add(candidate.id);
        addedDescendant = true;
      }
    });
  }

  return getPublishedEntries(graph, locale).filter(
    (entry) =>
      entry.categoryIds.some((categoryId) => categoryIds.has(categoryId)) &&
      (category.collectionIds.length === 0 || category.collectionIds.includes(entry.collectionId)),
  );
};

export const getPublicRouteRecords = (graph: ContentGraph) => {
  const pageRoutes = getPublishedPages(graph).map((page) => ({
    id: page.id,
    path: getPagePath(page, graph),
    updatedAt: page.updatedAt,
    locale: getContentLocale(page, graph.site),
    translationGroupId: page.translationGroupId,
    type: "page" as const,
  }));

  const entryRoutes = getPublishedEntries(graph).map((entry) => {
    const definition = graph.collectionDefinitions.find(
      (candidate) => candidate.id === entry.collectionId,
    );

    return {
      id: entry.id,
      path: getEntryPath(entry, definition, graph),
      updatedAt: entry.updatedAt,
      locale: getContentLocale(entry, graph.site),
      translationGroupId: entry.translationGroupId,
      type: "entry" as const,
    };
  });

  const collectionRoutes = getPublicCollections(graph).map((definition) => ({
    id: definition.id,
    path: getCollectionPath(definition, graph),
    updatedAt: definition.updatedAt,
    locale: getContentLocale(definition, graph.site),
    translationGroupId: definition.translationGroupId,
    type: "collection" as const,
  }));

  const categoryRoutes = getPublicCategories(graph).map((category) => ({
    id: category.id,
    path: getCategoryPath(category, graph),
    updatedAt: category.updatedAt,
    locale: getContentLocale(category, graph.site),
    translationGroupId: category.translationGroupId,
    type: "category" as const,
  }));

  return [...pageRoutes, ...collectionRoutes, ...entryRoutes, ...categoryRoutes];
};

export const getSitemapRouteRecords = (graph: ContentGraph) =>
  getPublicRouteRecords(graph)
    .flatMap((route) => {
      const subject =
        route.type === "page"
          ? graph.pages.find((candidate) => candidate.id === route.id)
          : route.type === "entry"
            ? graph.entries.find((candidate) => candidate.id === route.id)
            : route.type === "collection"
              ? graph.collectionDefinitions.find((candidate) => candidate.id === route.id)
              : graph.categories.find((candidate) => candidate.id === route.id);

      if (!subject || !isIndexableSeo(subject.seo)) return [];
      const isHome = route.path === applyLocalePrefix("/", graph.site, route.locale);
      const defaultPriority = route.type === "page" ? (isHome ? 1 : 0.7) : route.type === "category" ? 0.5 : 0.6;
      return [{
        ...route,
        changeFrequency: subject.seo.changeFrequency ?? (route.type === "entry" ? "monthly" : "weekly"),
        priority: subject.seo.sitemapPriority ?? defaultPriority,
      }];
    });
