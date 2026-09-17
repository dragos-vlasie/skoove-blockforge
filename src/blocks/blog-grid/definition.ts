import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const blogGridBlock = {
  type: BlockType.BLOG_GRID,
  label: "Blog Grid",
  shortLabel: "BG",
  category: "Content",
  order: 58,
  defaultContent: {
    eyebrow: "Latest writing",
    title: "Ideas, guides, and updates",
    subtitle: "Use this as a curated editorial grid or link it to collection pages later.",
    headingLevel: "h2",
    collectionId: "",
    categoryId: "",
    maxItems: 9,
    paginationMode: "none",
    pageSize: 9,
    showExcerpt: true,
    showDate: true,
    layout: "editorial",
    posts: [
      { title: "Designing a useful CMS", category: "Guide", excerpt: "How reusable blocks keep pages clean.", href: "/blog/", image: "", imageAlt: "" },
      { title: "Static publishing workflows", category: "Guide", excerpt: "A practical model for fast client websites.", href: "/blog/", image: "", imageAlt: "" },
      { title: "Content models that scale", category: "Guide", excerpt: "When to use pages, blocks, and collections.", href: "/blog/", image: "", imageAlt: "" },
    ],
  },
  schema: z
    .object({
      eyebrow: optionalString,
      title: z.string(),
      subtitle: optionalString,
      headingLevel: z.enum(["h1", "h2"]).default("h2"),
      collectionId: optionalString,
      categoryId: optionalString,
      maxItems: z.coerce.number().min(1).max(24).default(9),
      paginationMode: z.enum(["none", "archive"]).default("none"),
      pageSize: z.coerce.number().min(3).max(24).default(9),
      showExcerpt: z.boolean().default(true),
      showDate: z.boolean().default(true),
      layout: z.enum(["editorial", "cards", "compact", "portal-mosaic", "lead-mosaic", "publication-feed", "story-lane", "portrait-grid", "numbered-list", "popular-featured"]).default("editorial"),
      posts: z.array(z.object({ title: z.string(), excerpt: optionalString, href: optionalString }).passthrough()),
    })
    .passthrough(),
  fields: [
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "subtitle", label: "Subtitle", type: "textarea", rows: 3 },
    {
      id: "headingLevel",
      label: "Heading level",
      type: "select",
      options: [
        { label: "Page heading (H1)", value: "h1" },
        { label: "Section heading (H2)", value: "h2" },
      ],
    },
    { id: "collectionId", label: "Collection ID", type: "text", placeholder: "Leave empty for curated posts" },
    { id: "categoryId", label: "Category ID", type: "text", placeholder: "Optional category filter" },
    { id: "maxItems", label: "Maximum Items", type: "number" },
    {
      id: "paginationMode",
      label: "Pagination",
      type: "select",
      options: [
        { label: "No pagination", value: "none" },
        { label: "Paginated archive", value: "archive" },
      ],
    },
    { id: "pageSize", label: "Posts per page", type: "number" },
    { id: "showExcerpt", label: "Show excerpts", type: "boolean" },
    { id: "showDate", label: "Show dates", type: "boolean" },
    {
      id: "layout",
      label: "Layout",
      type: "select",
      options: [
        { label: "Editorial", value: "editorial" },
        { label: "Publication portal", value: "portal-mosaic" },
        { label: "Lead story mosaic", value: "lead-mosaic" },
        { label: "Publication feed", value: "publication-feed" },
        { label: "Story lane", value: "story-lane" },
        { label: "Portrait grid", value: "portrait-grid" },
        { label: "Numbered reading list", value: "numbered-list" },
        { label: "Featured story with list", value: "popular-featured" },
        { label: "Cards", value: "cards" },
        { label: "Compact", value: "compact" },
      ],
    },
    {
      id: "posts",
      label: "Posts",
      type: "repeater",
      addLabel: "Add Post",
      defaultItem: { title: "Post title", category: "Story", excerpt: "Short excerpt.", href: "/blog/", image: "", imageAlt: "" },
      fields: [
        { id: "title", label: "Title", type: "text" },
        { id: "category", label: "Category label", type: "text" },
        { id: "excerpt", label: "Excerpt", type: "textarea", rows: 3 },
        { id: "image", label: "Image", type: "image" },
        { id: "imageAlt", label: "Image description", type: "textarea", rows: 3 },
        { id: "href", label: "Link", type: "url" },
      ],
    },
  ],
} satisfies BlockDefinition;

export default blogGridBlock;
