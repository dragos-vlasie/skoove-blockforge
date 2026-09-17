import type { CollectionEntry, ContentGraph } from "../../../types";
import { getCategoryEntries, getEntryPath } from "../../lib/cms/routing";

export const DEFAULT_ARCHIVE_PAGE_SIZE = 9;

export function getPaginatedBlogGridBlock(subject: any) {
  return subject?.blocks?.find(
    (block: any) => block.type === "BLOG_GRID" && block.content?.paginationMode === "archive" && block.content?.collectionId,
  );
}

const entryTimestamp = (entry: CollectionEntry) =>
  String(entry.publishedAt || entry.updatedAt || "");

export function getBlogGridEntries(content: any, graph?: ContentGraph) {
  const definition = graph?.collectionDefinitions.find((item) => item.id === content.collectionId);
  if (!definition || !graph) return [];

  const selectedCategory = graph.categories.find((item) => item.id === content.categoryId);
  const candidates = selectedCategory ? getCategoryEntries(selectedCategory, graph) : graph.entries;

  return candidates
    .filter((entry) => entry.status === "published" && entry.collectionId === definition.id)
    .sort((left, right) => {
      const dateOrder = entryTimestamp(right).localeCompare(entryTimestamp(left));
      return dateOrder || left.id.localeCompare(right.id);
    });
}

export function getBlogGridPageCount(content: any, graph?: ContentGraph) {
  if (content.paginationMode !== "archive") return 1;
  const pageSize = Number(content.pageSize) || DEFAULT_ARCHIVE_PAGE_SIZE;
  return Math.max(1, Math.ceil(getBlogGridEntries(content, graph).length / pageSize));
}

export function resolveBlogGridListing(content: any, graph?: ContentGraph, requestedPage = 1) {
  const definition = graph?.collectionDefinitions.find((item) => item.id === content.collectionId);
  const entries = getBlogGridEntries(content, graph);
  const isPaginated = content.paginationMode === "archive" && Boolean(definition);
  const pageSize = isPaginated
    ? Number(content.pageSize) || DEFAULT_ARCHIVE_PAGE_SIZE
    : Number(content.maxItems) || DEFAULT_ARCHIVE_PAGE_SIZE;
  const totalPages = isPaginated ? Math.max(1, Math.ceil(entries.length / pageSize)) : 1;
  const currentPage = isPaginated ? Math.max(1, requestedPage) : 1;
  const start = isPaginated ? (currentPage - 1) * pageSize : 0;
  const selectedEntries = entries.slice(start, start + pageSize);

  const posts = selectedEntries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    excerpt: entry.excerpt || entry.seo.description,
    href: definition && graph ? getEntryPath(entry, definition, graph) : "#",
    image: entry.fields?.featuredImage || entry.seo.ogImage || "",
    imageAlt: entry.fields?.featuredImageAlt || entry.title,
    imagePosition: entry.fields?.featuredImagePosition || "center",
    date: entry.publishedAt,
    readingTime: entry.fields?.readingTime,
    categories: entry.categoryIds
      .map((id) => graph?.categories.find((category) => category.id === id)?.name)
      .filter(Boolean),
    category:
      entry.categoryIds
        .map((id) => graph?.categories.find((category) => category.id === id))
        .find(Boolean)?.name || definition?.singularName || "Story",
  }));

  return { posts, currentPage, totalPages, pageSize, isPaginated };
}

export type BlogGridListing = ReturnType<typeof resolveBlogGridListing>;

export function getPaginationItems(currentPage: number, totalPages: number) {
  const visible = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const pages = [...visible].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous > 1) items.push("ellipsis");
    items.push(page);
  });

  return items;
}
