import { BlockType, CollectionDefinition, PageContent } from "./types";

const now = "2026-05-29T00:00:00.000Z";

const collectionIndexSeo = (title: string, description: string) => ({
  title,
  description,
  ogImage: "https://picsum.photos/1200/630",
  robots: "index,follow" as const,
  twitterCard: "summary_large_image" as const,
  schemaType: "CollectionPage" as const,
});

export const INITIAL_PAGE_DATA: PageContent = {
  id: "page-home",
  kind: "page",
  title: "Home",
  name: "Home Page",
  slug: "/",
  status: "published",
  templateId: "landing-page",
  parentId: null,
  order: 0,
  showInNavigation: true,
  navigationLabel: "Home",
  updatedAt: now,
  seo: {
    title: "BlockForge | Built with Blocks",
    description: "Deterministic block-based content management system for Next.js.",
    ogImage: "https://picsum.photos/1200/630",
    keywords: "cms, nextjs, blocks, json-content",
    robots: "index,follow",
    twitterCard: "summary_large_image",
    schemaType: "WebPage",
  },
  blocks: [
    {
      id: "block-hero",
      type: BlockType.HERO,
      content: {
        title: "Build the Future with BlockForge",
        subtitle:
          "The deterministic JSON-first CMS that keeps your data structured and your site instantly fast.",
        buttonText: "Explore the CMS",
        bgImage:
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80",
        imageAlt: "Earth viewed from orbit",
      },
    },
    {
      id: "block-text",
      type: BlockType.TEXT,
      content: {
        title: "Structured for Success",
        nodes: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Why choose JSON blocks?" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Traditional HTML storage in CMS databases leads to hydration errors, styling conflicts, and difficult migrations. BlockForge stores raw data, validates it, and renders clean Next.js pages.",
                },
              ],
            },
            { type: "horizontalRule" },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Clean deterministic data" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Server-rendered Next.js output by default" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "SEO and schema handled out of the gate" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  ],
};

export const COLLECTION_PRESETS: CollectionDefinition[] = [
  {
    id: "collection-articles",
    name: "Articles",
    singularName: "Article",
    routeParentId: null,
    slug: "articles",
    description: "Editorial content, blogs, guides, and resources.",
    preset: "article",
    schemaType: "Article",
    entryTemplateId: "article-standard",
    indexTemplateId: "blog-index",
    hasBlocks: true,
    publicIndex: true,
    seo: collectionIndexSeo(
      "Articles",
      "Browse articles, guides, resources, and editorial updates from BlockForge CMS in one organized article library.",
    ),
    categoryIds: ["category-guides", "category-news"],
    updatedAt: now,
    fields: [
      { id: "body", label: "Article Body", type: "richText", required: false },
      { id: "readingTime", label: "Reading Time", type: "text", required: false },
      { id: "featuredImage", label: "Featured Image", type: "image", required: false },
      { id: "featuredImageAlt", label: "Featured Image Alt", type: "text", required: false },
      { id: "sourceUrl", label: "Original Source URL", type: "url", required: false },
    ],
  },
  {
    id: "collection-docs",
    name: "Docs",
    singularName: "Doc",
    routeParentId: null,
    slug: "docs",
    description: "Documentation pages and knowledge base entries.",
    preset: "docs",
    schemaType: "WebPage",
    entryTemplateId: "article-standard",
    indexTemplateId: "blog-index",
    hasBlocks: true,
    publicIndex: true,
    seo: collectionIndexSeo(
      "Docs",
      "Browse documentation, knowledge base articles, setup notes, and implementation guides for this project.",
    ),
    categoryIds: [],
    updatedAt: now,
    fields: [{ id: "version", label: "Version", type: "text", required: false }],
  },
  {
    id: "collection-products",
    name: "Products",
    singularName: "Product",
    routeParentId: null,
    slug: "products",
    description: "Product landing pages with product schema.",
    preset: "product",
    schemaType: "Product",
    entryTemplateId: "article-standard",
    indexTemplateId: "blog-index",
    hasBlocks: true,
    publicIndex: true,
    seo: collectionIndexSeo(
      "Products",
      "Browse product pages, pricing details, specifications, and product information in one searchable catalog.",
    ),
    categoryIds: [],
    updatedAt: now,
    fields: [
      { id: "price", label: "Price", type: "text", required: false },
      { id: "priceCurrency", label: "Currency", type: "text", required: false },
      { id: "sku", label: "SKU", type: "text", required: false },
    ],
  },
  {
    id: "collection-case-studies",
    name: "Case Studies",
    singularName: "Case Study",
    routeParentId: null,
    slug: "case-studies",
    description: "Customer stories and proof pages.",
    preset: "case-study",
    schemaType: "Article",
    entryTemplateId: "article-standard",
    indexTemplateId: "blog-index",
    hasBlocks: true,
    publicIndex: true,
    seo: collectionIndexSeo(
      "Case Studies",
      "Browse customer stories, project outcomes, implementation details, and proof pages for completed work.",
    ),
    categoryIds: [],
    updatedAt: now,
    fields: [
      { id: "client", label: "Client", type: "text", required: false },
      { id: "outcome", label: "Outcome", type: "textarea", required: false },
    ],
  },
  {
    id: "collection-people",
    name: "People",
    singularName: "Person",
    routeParentId: null,
    slug: "people",
    description: "Team members, authors, experts, and profiles.",
    preset: "person",
    schemaType: "Person",
    entryTemplateId: "author-profile",
    indexTemplateId: "blog-index",
    hasBlocks: false,
    publicIndex: true,
    seo: collectionIndexSeo(
      "People",
      "Browse team members, authors, experts, contributors, and profile pages in one organized people directory.",
    ),
    categoryIds: [],
    updatedAt: now,
    fields: [
      { id: "role", label: "Role", type: "text", required: false },
      { id: "photo", label: "Photo", type: "image", required: false },
    ],
  },
  {
    id: "collection-landing-pages",
    name: "Landing Pages",
    singularName: "Landing Page",
    routeParentId: null,
    slug: "landing",
    description: "Campaign pages that behave like collection entries.",
    preset: "landing",
    schemaType: "WebPage",
    entryTemplateId: "landing-page",
    indexTemplateId: "blog-index",
    hasBlocks: true,
    publicIndex: false,
    seo: collectionIndexSeo(
      "Landing Pages",
      "Browse campaign pages, landing page entries, offer pages, and conversion-focused content models.",
    ),
    categoryIds: [],
    updatedAt: now,
    fields: [{ id: "campaign", label: "Campaign", type: "text", required: false }],
  },
  {
    id: "collection-generic",
    name: "Generic Content",
    singularName: "Entry",
    routeParentId: null,
    slug: "content",
    description: "Flexible content entries when no preset fits.",
    preset: "generic",
    schemaType: "WebPage",
    entryTemplateId: "article-standard",
    indexTemplateId: "blog-index",
    hasBlocks: true,
    publicIndex: true,
    seo: collectionIndexSeo(
      "Content",
      "Browse flexible content entries, custom CMS records, and reusable models that do not fit another preset.",
    ),
    categoryIds: [],
    updatedAt: now,
    fields: [{ id: "summary", label: "Summary", type: "textarea", required: false }],
  },
];
