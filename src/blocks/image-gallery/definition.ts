import { z } from "zod";
import { BlockType } from "../../../types";
import { galleryImageSchema, optionalString, type BlockDefinition } from "../types";

export const imageGalleryBlock = {
  type: BlockType.IMAGE_GALLERY,
  label: "Image Gallery",
  shortLabel: "I",
  category: "Marketing",
  order: 40,
  defaultContent: {
    presentation: "theme",
    title: "Visual Portfolio",
    images: [
      {
        src: "https://picsum.photos/800/600?1",
        alt: "Portfolio example one",
      },
      {
        src: "https://picsum.photos/800/600?2",
        alt: "Portfolio example two",
      },
      {
        src: "https://picsum.photos/800/600?3",
        alt: "Portfolio example three",
      },
    ],
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "grid", "mosaic", "feature", "minimal"]).default("theme"),
      title: optionalString,
      images: z.array(galleryImageSchema),
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Equal grid", value: "grid" },
        { label: "Mosaic", value: "mosaic" },
        { label: "Featured first image", value: "feature" },
        { label: "Minimal", value: "minimal" },
      ],
    },
    { id: "title", label: "Title", type: "text" },
    {
      id: "images",
      label: "Images",
      type: "repeater",
      addLabel: "Add Image",
      defaultItem: { src: "", alt: "" },
      fields: [
        { id: "src", label: "Image URL", type: "image", placeholder: "Image URL" },
        { id: "alt", label: "Alt Text", type: "textarea", rows: 3, placeholder: "Describe the image for screen readers" },
      ],
    },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme gallery", description: "The gallery treatment recommended by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "grid", name: "Image grid", description: "A consistent grid for portfolios or collections.", content: { presentation: "grid" } },
    { id: "mosaic", name: "Editorial mosaic", description: "Alternating image emphasis for a more expressive story.", content: { presentation: "mosaic" } },
    { id: "feature", name: "Featured image", description: "Lead with one large image followed by supporting images.", content: { presentation: "feature" } },
  ],
} satisfies BlockDefinition;

export default imageGalleryBlock;
