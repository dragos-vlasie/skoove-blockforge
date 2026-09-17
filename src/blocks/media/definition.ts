import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const mediaBlock = {
  type: BlockType.MEDIA,
  label: "Media",
  shortLabel: "M",
  category: "Content",
  order: 22,
  defaultContent: {
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80",
    imageAlt: "",
    caption: "",
    aspectRatio: "landscape",
    treatment: "theme",
  },
  schema: z
    .object({
      image: z.string(),
      imageAlt: optionalString,
      caption: optionalString,
      aspectRatio: z.enum(["landscape", "portrait", "square", "natural"]).default("landscape"),
      treatment: z.enum(["theme", "plain", "framed", "full-bleed"]).default("theme"),
    })
    .passthrough(),
  fields: [
    { id: "image", label: "Image", type: "image" },
    { id: "imageAlt", label: "Alternative Text", type: "textarea", rows: 3 },
    { id: "caption", label: "Caption", type: "text" },
    {
      id: "aspectRatio",
      label: "Shape",
      type: "select",
      options: [
        { label: "Landscape", value: "landscape" },
        { label: "Portrait", value: "portrait" },
        { label: "Square", value: "square" },
        { label: "Natural", value: "natural" },
      ],
    },
    {
      id: "treatment",
      label: "Treatment",
      type: "select",
      helpText: "Theme default applies the image treatment chosen for this website.",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Plain", value: "plain" },
        { label: "Framed", value: "framed" },
        { label: "Full bleed", value: "full-bleed" },
      ],
    },
  ],
  compositionRole: "both",
  presets: [
    {
      id: "theme-landscape",
      name: "Theme image",
      description: "A landscape image using the active website treatment.",
      recommended: true,
      content: { aspectRatio: "landscape", treatment: "theme" },
    },
    {
      id: "portrait",
      name: "Portrait image",
      description: "A taller image suited to people, products, or editorial photography.",
      content: { aspectRatio: "portrait", treatment: "theme" },
    },
    {
      id: "square",
      name: "Square image",
      description: "A balanced image shape for cards and mixed grids.",
      content: { aspectRatio: "square", treatment: "theme" },
    },
  ],
} satisfies BlockDefinition;

export default mediaBlock;
