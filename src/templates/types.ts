import type { CollectionDefinition, CollectionEntry, ContentGraph, PageContent, Category } from "../../types";

export type TemplateRouteType = "page" | "entry" | "collection" | "category";

export type TemplateId =
  | "landing-page"
  | "article-standard"
  | "author-profile"
  | "blog-index"
  | "category-index";

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  description: string;
  routeType: TemplateRouteType;
}

export interface TemplateRenderProps {
  graph: ContentGraph;
  routeType: TemplateRouteType;
  path: string;
  subject: PageContent | CollectionEntry | CollectionDefinition | Category;
  collection?: CollectionDefinition;
}
