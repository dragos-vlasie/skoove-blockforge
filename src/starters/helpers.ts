import { COLLECTION_PRESETS } from "../../constants";
import type { CollectionDefinition, ContentGraph, NavigationItem, PageContent } from "../../types";
import { createId, emptySeo, now, slugify } from "../cms/contentUtils";
import { createDesignFromThemePreset } from "../themes/registry";

export const ensurePage = (
  graph: ContentGraph,
  input: {
    id?: string;
    title: string;
    slug: string;
    order: number;
    description: string;
    blocks: PageContent["blocks"];
  },
) => {
  const slug = input.slug === "/" ? "/" : slugify(input.slug);
  const existing = graph.pages.find((page) => page.slug === slug || page.id === input.id);
  const page: PageContent = existing ?? {
    id: input.id ?? createId("page"),
    kind: "page",
    title: input.title,
    name: input.title,
    slug,
    status: "draft",
    templateId: "landing-page",
    parentId: null,
    order: input.order,
    showInNavigation: true,
    navigationLabel: input.title,
    updatedAt: now(),
    seo: emptySeo(input.title),
    blocks: [],
  };

  page.title = input.title;
  page.name = input.title;
  page.slug = slug;
  page.order = input.order;
  page.navigationLabel = input.title;
  page.templateId = "landing-page";
  page.seo.title = input.title;
  page.seo.description = input.description;
  page.blocks = input.blocks;
  page.updatedAt = now();

  if (!existing) graph.pages.push(page);
  return page;
};

export const setHeaderNavigation = (graph: ContentGraph, pages: PageContent[]) => {
  const items: NavigationItem[] = pages.map((page) => ({
    id: createId("nav-item"),
    label: page.navigationLabel || page.title,
    targetType: "page",
    targetId: page.id,
  }));
  setHeaderItems(graph, items);
};

export const setHeaderItems = (graph: ContentGraph, items: NavigationItem[]) => {
  const header = graph.navigation.find((menu) => menu.location === "header");
  if (header) {
    header.items = items;
  } else {
    graph.navigation.push({ id: "nav-header", name: "Header", location: "header", items });
  }
};

export const setFooterItems = (graph: ContentGraph, items: NavigationItem[]) => {
  const footer = graph.navigation.find((menu) => menu.location === "footer");
  if (footer) {
    footer.items = items;
  } else {
    graph.navigation.push({ id: "nav-footer", name: "Footer", location: "footer", items });
  }
};

export const setBaseBrand = (
  graph: ContentGraph,
  input: {
    name: string;
    description: string;
    themeId?: string;
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    headingFont?: string;
    bodyFont?: string;
    radius?: "sm" | "md" | "lg";
  },
) => {
  graph.site.siteName = input.name;
  graph.site.defaultDescription = input.description;
  graph.site.defaultTitlePattern = `%s | ${input.name}`;
  graph.site.organization.name = input.name;
  graph.site.design = createDesignFromThemePreset(input.themeId, {
    primaryColor: input.primaryColor,
    accentColor: input.accentColor,
    backgroundColor: input.backgroundColor,
    textColor: input.textColor,
    headingFont: input.headingFont,
    bodyFont: input.bodyFont,
    radius: input.radius,
  });
};

export const ensureCollectionPreset = (graph: ContentGraph, presetId: string): CollectionDefinition | null => {
  const existing = graph.collectionDefinitions.find((definition) => definition.id === presetId);
  if (existing) return existing;
  const preset = COLLECTION_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) return null;
  const next = JSON.parse(JSON.stringify(preset)) as CollectionDefinition;
  graph.collectionDefinitions.push(next);
  return next;
};

export const ensureBlogModel = (graph: ContentGraph): CollectionDefinition | null => ensureCollectionPreset(graph, "collection-articles");
