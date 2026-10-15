import type { ContentGraph } from "../../types";
import { getPublicRouteRecords, getPublicCollections, getPublicCategories, getPublishedPages,
  getCollectionEntries, getCategoryEntries, getCollectionPath, getCategoryPath, getPagePath,
  withTrailingSlash } from "../lib/cms/routing";
import { getBlogGridPageCount, getPaginatedBlogGridBlock } from "../blocks/blog-grid/listing";

// Include every route the public resolver can serve, including translated homes,
// archives, pagination and redirects, rather than just routes in the sitemap.
export function publishedPaths(graph: ContentGraph): string[] {
  const paths = new Set(getPublicRouteRecords(graph).map((route) => route.path));
  const paginate = (base: string, count: number) => {
    for (let page = 2; page <= count; page++) paths.add(`${withTrailingSlash(base)}page/${page}/`);
  };
  for (const collection of getPublicCollections(graph)) {
    paginate(getCollectionPath(collection, graph), Math.ceil(getCollectionEntries(collection, graph).length / 12));
  }
  for (const category of getPublicCategories(graph)) {
    paginate(getCategoryPath(category, graph), Math.ceil(getCategoryEntries(category, graph).length / 12));
  }
  for (const page of getPublishedPages(graph).filter((page) => page.slug === "/")) {
    const block = getPaginatedBlogGridBlock(page);
    if (block) paginate(getPagePath(page, graph), getBlogGridPageCount(block.content, graph));
  }
  for (const rule of graph.redirects) paths.add(withTrailingSlash(rule.from));
  if (graph.site.siteName === "Skoove Blog") {
    for (const path of [...paths]) if (path.startsWith("/blog/")) paths.add(withTrailingSlash(path.slice(5)));
  }
  return [...paths];
}
