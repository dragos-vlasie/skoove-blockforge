import type { MetadataRoute } from "next";
import { getPublishedContent } from "../src/lib/cms/contentStore";
import { getCategoryPath, getCollectionPath, getEntryPath, getPagePath, getPublicCategories, getPublicCollections, getPublishedEntries, getPublishedPages } from "../src/lib/cms/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const graph = await getPublishedContent();
  const origin = graph.site.siteUrl.replace(/\/$/, "");
  const paths = [
    ...getPublishedPages(graph).map((item) => getPagePath(item, graph)),
    ...getPublicCollections(graph).map((item) => getCollectionPath(item, graph)),
    ...getPublishedEntries(graph).map((item) => getEntryPath(item, graph.collectionDefinitions.find((collection) => collection.id === item.collectionId), graph)),
    ...getPublicCategories(graph).map((item) => getCategoryPath(item, graph)),
  ];
  return [...new Set(paths)].map((path) => ({ url: `${origin}${path}`, lastModified: new Date() }));
}
