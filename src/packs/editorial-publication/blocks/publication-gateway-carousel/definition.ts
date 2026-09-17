import { z } from "zod";
import { BlockType } from "../../../../../types";
import type { BlockDefinition } from "../../../../blocks/types";

const gatewaySchema = z.object({
  title: z.string(),
  href: z.string(),
  image: z.string(),
  imageAlt: z.string().optional(),
  imagePosition: z.string().optional(),
});

const publicationGatewayCarouselBlock = {
  type: BlockType.PUBLICATION_GATEWAY_CAROUSEL,
  packId: "editorial-publication",
  label: "Publication Gateway Carousel",
  shortLabel: "GC",
  category: "Editorial Publication",
  order: 6,
  defaultContent: {
    title: "Explore the publication",
    ariaLabel: "Explore publication topics",
    items: [
      {
        title: "Stories from remarkable places",
        href: "/",
        image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=82&w=1400",
        imageAlt: "Traveller looking across a wide landscape",
        imagePosition: "center",
      },
      {
        title: "Practical field guides",
        href: "/",
        image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=82&w=1000",
        imageAlt: "Mountain road through a national park",
        imagePosition: "center",
      },
      {
        title: "Notes from the journey",
        href: "/",
        image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=82&w=1000",
        imageAlt: "Travellers walking together outdoors",
        imagePosition: "center",
      },
    ],
  },
  schema: z.object({
    title: z.string(),
    ariaLabel: z.string().optional(),
    items: z.array(gatewaySchema),
  }).passthrough(),
  fields: [
    { id: "title", label: "Page heading", type: "text" },
    { id: "ariaLabel", label: "Carousel label", type: "text" },
    {
      id: "items",
      label: "Gateway cards",
      type: "repeater",
      addLabel: "Add gateway",
      defaultItem: { title: "Gateway", href: "/", image: "", imageAlt: "", imagePosition: "center" },
      fields: [
        { id: "title", label: "Title", type: "textarea", rows: 2 },
        { id: "href", label: "Link", type: "url" },
        { id: "image", label: "Image", type: "image" },
        { id: "imageAlt", label: "Image alt text", type: "text" },
        { id: "imagePosition", label: "Image focal point", type: "text" },
      ],
    },
  ],
  compositionRole: "section",
} satisfies BlockDefinition;

export default publicationGatewayCarouselBlock;
