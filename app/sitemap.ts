import type { MetadataRoute } from "next";
import { getOptionalPublishedRouteIndexForRender as getOptionalPublishedContent } from "../src/next/publishedContent";
import { getCategoryPath, getCollectionPath, getEntryPath, getPagePath, getPublicCategories, getPublicCollections, getPublishedEntries, getPublishedPages } from "../src/lib/cms/routing";
import { isIndexableSeo } from "../src/lib/cms/seo";

export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const graph = await getOptionalPublishedContent();
  if (!graph) return [];
  const origin = graph.site.siteUrl.replace(/\/$/, "");
  const paths = [
    ...getPublishedPages(graph).filter((item) => isIndexableSeo(item.seo)).map((item) => getPagePath(item, graph)),
    ...getPublicCollections(graph).filter((item) => isIndexableSeo(item.seo)).map((item) => getCollectionPath(item, graph)),
    ...getPublishedEntries(graph).filter((item) => isIndexableSeo(item.seo)).map((item) => getEntryPath(item, graph.collectionDefinitions.find((collection) => collection.id === item.collectionId), graph)),
    ...getPublicCategories(graph).filter((item) => isIndexableSeo(item.seo)).map((item) => getCategoryPath(item, graph)),
  ];
  return [...new Set(paths)].map((path) => ({ url: `${origin}${path}`, lastModified: new Date() }));
}
