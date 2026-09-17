import type { CollectionDefinition } from "../../../types";

export const editorialPublicationCollectionPresets = [
  {
    id: "collection-articles",
    name: "Articles",
    singularName: "Article",
    routeParentId: null,
    // An empty collection segment preserves WordPress-style root article URLs.
    // Publications that use /blog/ can change this before applying the import.
    slug: "",
    description: "Long-form editorial stories with authors, publication dates, categories, and rich content.",
    preset: "article",
    schemaType: "Article",
    entryTemplateId: "article-standard",
    indexTemplateId: "blog-index",
    hasBlocks: true,
    publicIndex: false,
    seo: {
      title: "Articles",
      description: "Browse the latest stories and editorial guides.",
      ogImage: "",
      robots: "index,follow",
      twitterCard: "summary_large_image",
      schemaType: "CollectionPage",
    },
    fields: [
      { id: "featuredImage", label: "Featured Image", type: "image", required: false },
      { id: "featuredImageAlt", label: "Featured Image Alt", type: "text", required: false },
      { id: "featuredImagePosition", label: "Featured Image Focal Point (e.g. 50% 35%)", type: "text", required: false },
      { id: "sourceUrl", label: "Original URL", type: "url", required: false },
      { id: "sourceId", label: "WordPress ID", type: "number", required: false },
    ],
    categoryIds: [],
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
] as const satisfies readonly CollectionDefinition[];
