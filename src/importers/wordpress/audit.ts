import type { WordPressClient } from "./client";
import type { WordPressEntity, WordPressSiteAudit, WordPressTerm } from "./types";

const routeFields = "id,slug,link,title,status,parent,count";

const titleFor = (entity: WordPressEntity) =>
  String(entity.title?.rendered ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

const treeFor = (categories: WordPressTerm[]) => {
  const byParent = new Map<number, WordPressTerm[]>();
  categories.forEach((category) => {
    const parent = category.parent ?? 0;
    byParent.set(parent, [...(byParent.get(parent) ?? []), category]);
  });
  return categories
    .filter((category) => !category.parent)
    .map((category) => ({ ...category, children: byParent.get(category.id) ?? [] }));
};

export async function auditWordPressSite(client: WordPressClient): Promise<WordPressSiteAudit> {
  const [postsSummary, pagesSummary, categoriesSummary, tagsSummary, mediaSummary, usersSummary] = await Promise.all([
    client.collectionSummary("posts"),
    client.collectionSummary("pages"),
    client.collectionSummary("categories"),
    client.collectionSummary("tags"),
    client.collectionSummary("media"),
    client.collectionSummary("users"),
  ]);

  const [posts, pages, categories, tags] = await Promise.all([
    client.getPosts(routeFields),
    client.getPages(routeFields),
    client.getCategories(routeFields),
    client.getTags(routeFields),
  ]);

  const routes: WordPressSiteAudit["routes"] = [
    ...posts.map((post) => ({
      kind: "post" as const,
      id: post.id,
      slug: post.slug,
      url: post.link ?? "",
      title: titleFor(post),
      status: post.status,
      locale: client.locale,
    })),
    ...pages.map((page) => ({
      kind: "page" as const,
      id: page.id,
      slug: page.slug,
      url: page.link ?? "",
      title: titleFor(page),
      status: page.status,
      parentId: Number(page.parent ?? 0),
      locale: client.locale,
    })),
    ...categories.map((category) => ({
      kind: "category" as const,
      id: category.id,
      slug: category.slug,
      url: category.link ?? "",
      title: category.name,
      parentId: category.parent ?? 0,
      count: category.count ?? 0,
      locale: client.locale,
    })),
    ...tags.map((tag) => ({
      kind: "tag" as const,
      id: tag.id,
      slug: tag.slug,
      url: tag.link ?? "",
      title: tag.name,
      parentId: tag.parent ?? 0,
      count: tag.count ?? 0,
      locale: client.locale,
    })),
  ];

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    siteUrl: client.siteUrl,
    apiUrl: client.apiUrl,
    locale: client.locale,
    collections: {
      posts: postsSummary,
      pages: pagesSummary,
      categories: categoriesSummary,
      tags: tagsSummary,
      media: mediaSummary,
      users: usersSummary,
    },
    routes,
    categoryTree: treeFor(categories),
    notes: [
      "Public API counts include published public content only.",
      "Media is inventoried by count in this phase; files remain linked to WordPress.",
      "Authenticated context=edit or WXR is recommended before final conversion.",
    ],
  };
}
