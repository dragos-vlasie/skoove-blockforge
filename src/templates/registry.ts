import type { Category, CollectionDefinition, CollectionEntry, PageContent } from "../../types";
import type { TemplateDefinition, TemplateId, TemplateRouteType } from "./types";

export const templateDefinitions: TemplateDefinition[] = [
  {
    id: "landing-page",
    label: "Landing Page",
    description: "Default page template that renders the page blocks in order.",
    routeType: "page",
  },
  {
    id: "article-standard",
    label: "Article",
    description: "Editorial article layout with hero image, metadata, body, blocks, and related posts.",
    routeType: "entry",
  },
  {
    id: "author-profile",
    label: "Author Profile",
    description: "Person/profile layout for author or team member entries.",
    routeType: "entry",
  },
  {
    id: "blog-index",
    label: "Blog Index",
    description: "Collection listing template for article libraries and blogs.",
    routeType: "collection",
  },
  {
    id: "category-index",
    label: "Category Index",
    description: "Topic page listing matching published entries.",
    routeType: "category",
  },
];

export const templatesById = Object.fromEntries(
  templateDefinitions.map((template) => [template.id, template]),
) as Record<TemplateId, TemplateDefinition>;

export const templatesForRoute = (routeType: TemplateRouteType) =>
  templateDefinitions.filter((template) => template.routeType === routeType || (routeType === "entry" && template.id === "landing-page"));

export const getDefaultEntryTemplateId = (definition?: CollectionDefinition | null): TemplateId => {
  if (definition?.schemaType === "Person" || definition?.preset === "person") return "author-profile";
  return "article-standard";
};

export const getDefaultCollectionTemplateId = (definition?: CollectionDefinition | null): TemplateId =>
  definition?.preset === "article" ? "blog-index" : "blog-index";

export const resolvePageTemplateId = (page: PageContent): TemplateId =>
  (page.templateId as TemplateId | undefined) ?? "landing-page";

export const resolveEntryTemplateId = (
  entry: CollectionEntry,
  definition?: CollectionDefinition | null,
): TemplateId =>
  (entry.templateId as TemplateId | undefined) ??
  (definition?.entryTemplateId as TemplateId | undefined) ??
  getDefaultEntryTemplateId(definition);

export const resolveCollectionTemplateId = (definition: CollectionDefinition): TemplateId =>
  (definition.indexTemplateId as TemplateId | undefined) ?? getDefaultCollectionTemplateId(definition);

export const resolveCategoryTemplateId = (category: Category): TemplateId =>
  (category.indexTemplateId as TemplateId | undefined) ?? "category-index";
