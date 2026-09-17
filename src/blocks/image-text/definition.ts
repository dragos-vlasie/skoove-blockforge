import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const imageTextBlock = {
  type: BlockType.IMAGE_TEXT,
  label: "Image/Text",
  shortLabel: "IT",
  category: "Marketing",
  order: 38,
  defaultContent: {
    layout: "theme",
    eyebrow: "Built to adapt",
    title: "Tell the story with a strong visual",
    body: "Pair a focused message with a product shot, team image, case study visual, or service photo.",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80",
    imageAlt: "Workspace",
    buttonText: "Learn more",
    href: "/about/",
  },
  schema: z
    .object({
      layout: z.enum(["theme", "image-left", "image-right", "image-top"]).default("theme"),
      eyebrow: optionalString,
      title: z.string(),
      body: z.string(),
      image: z.string(),
      imageAlt: optionalString,
      buttonText: optionalString,
      href: optionalString,
    })
    .passthrough(),
  fields: [
    {
      id: "layout",
      label: "Layout",
      type: "select",
      helpText: "Theme default keeps this section consistent with the rest of the website.",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Image left", value: "image-left" },
        { label: "Image right", value: "image-right" },
        { label: "Image above", value: "image-top" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "body", label: "Body", type: "textarea", rows: 4 },
    { id: "image", label: "Image", type: "image" },
    { id: "imageAlt", label: "Image Alt", type: "textarea", rows: 3 },
    { id: "buttonText", label: "Button Text", type: "text" },
    { id: "href", label: "Button Link", type: "url" },
  ],
  compositionRole: "both",
  presets: [
    {
      id: "theme-default",
      name: "Theme story",
      description: "Use the media-story composition recommended by the active theme.",
      recommended: true,
      content: { layout: "theme" },
    },
    {
      id: "image-left",
      name: "Image left",
      description: "Lead with the image, followed by supporting copy.",
      content: { layout: "image-left" },
    },
    {
      id: "image-right",
      name: "Image right",
      description: "Lead with the message, followed by supporting media.",
      content: { layout: "image-right" },
    },
    {
      id: "image-top",
      name: "Image above",
      description: "A vertical composition useful inside narrower layouts.",
      content: { layout: "image-top" },
    },
  ],
} satisfies BlockDefinition;

export default imageTextBlock;
