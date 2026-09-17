import type { CollectionDefinition } from "../../../types";

export const travelAgencyCollectionPresets = [
  {
    id: "collection-tours",
    name: "Tours",
    singularName: "Tour",
    routeParentId: null,
    slug: "tours",
    description: "Repeatable tour pages with dates, prices, itinerary details, and enquiry content.",
    preset: "product",
    schemaType: "Product",
    entryTemplateId: "landing-page",
    indexTemplateId: "blog-index",
    hasBlocks: true,
    publicIndex: true,
    seo: {
      title: "Tours",
      description: "Browse available tours, departure dates, prices, and detailed itineraries.",
      ogImage: "",
      robots: "index,follow",
      twitterCard: "summary_large_image",
      schemaType: "CollectionPage",
    },
    fields: [
      { id: "summary", label: "Short Summary", type: "textarea", required: true },
      { id: "heroImage", label: "Featured Image", type: "image", required: true },
      { id: "heroImageAlt", label: "Featured Image Alt", type: "text", required: false },
      { id: "priceCurrency", label: "Currency", type: "text", required: false },
      { id: "durationRange", label: "Duration", type: "text", required: false },
      { id: "transportSummary", label: "Transport", type: "text", required: false },
      { id: "programmeUrl", label: "Programme Link", type: "url", required: false },
    ],
    categoryIds: [],
    updatedAt: "2026-07-31T00:00:00.000Z",
  },
] as const satisfies readonly CollectionDefinition[];
