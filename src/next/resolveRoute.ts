import { getCategoryPath, getCollectionPath, getEntryPath, getPagePath, getPublicCategories, getPublicCollections, getPublishedEntries, getPublishedPages, withTrailingSlash } from "../lib/cms/routing";
import { getBlogGridPageCount, getPaginatedBlogGridBlock } from "../blocks/blog-grid/listing";

export function resolvePublishedRoute(graph: any, inputPath: string) {
  const path = withTrailingSlash(inputPath || "/");
  const page = getPublishedPages(graph).find((candidate) => getPagePath(candidate, graph) === path);
  if (page) return { graph, routeType: "page", path, subject: page };
  const entry = getPublishedEntries(graph).find((candidate) => {
    const collection = graph.collectionDefinitions.find((item: any) => item.id === candidate.collectionId);
    return getEntryPath(candidate, collection, graph) === path;
  });
  if (entry) return { graph, routeType: "entry", path, subject: entry, collection: graph.collectionDefinitions.find((item: any) => item.id === entry.collectionId) };
  const collection = getPublicCollections(graph).find((candidate) => getCollectionPath(candidate, graph) === path);
  if (collection) return { graph, routeType: "collection", path, subject: collection };
  const category = getPublicCategories(graph).find((candidate) => getCategoryPath(candidate, graph) === path);
  if (category) return { graph, routeType: "category", path, subject: category };
  for (const subject of getPublicCategories(graph)) {
    const categoryPath = getCategoryPath(subject, graph);
    const pageMatch = path.startsWith(categoryPath) ? path.slice(categoryPath.length).match(/^page\/(\d+)\/$/) : null;
    if (pageMatch) return { graph, routeType: "category", path, subject, page: Number(pageMatch[1]) };
  }
  for (const subject of getPublishedPages(graph).filter((candidate) => candidate.slug === "/")) {
    const homePath = getPagePath(subject, graph);
    const homePageMatch = path.startsWith(homePath) ? path.slice(homePath.length).match(/^page\/(\d+)\/$/) : null;
    if (!homePageMatch) continue;
    const block = getPaginatedBlogGridBlock(subject);
    const requested = Number(homePageMatch[1]);
    const count = block ? getBlogGridPageCount(block.content, graph) : 1;
    if (subject && block && requested >= 2 && requested <= count) return { graph, routeType: "page", path, subject, page: requested };
  }
  return null;
}
