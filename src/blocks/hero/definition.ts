import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const heroBlock = {
  type: BlockType.HERO,
  label: "Hero",
  shortLabel: "H",
  category: "Marketing",
  order: 10,
  defaultContent: {
    layout: "theme",
    eyebrow: "A clear introduction",
    title: "Give the page a strong opening",
    subtitle: "Pair a focused promise with a supporting image and one obvious next step.",
    buttonText: "Get started",
    href: "#content",
    secondaryButtonText: "Learn more",
    secondaryHref: "#content",
    bgImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80",
    imageAlt: "",
    imageCaption: "",
  },
  schema: z
    .object({
      layout: z.enum(["theme", "media-left", "media-right", "centered", "background"]).default("theme"),
      eyebrow: optionalString,
      title: z.string(),
      subtitle: optionalString,
      buttonText: optionalString,
      href: optionalString,
      secondaryButtonText: optionalString,
      secondaryHref: optionalString,
      bgImage: z.string(),
      imageAlt: optionalString,
      imageCaption: optionalString,
    })
    .passthrough(),
  fields: [
    {
      id: "layout",
      label: "Layout",
      type: "select",
      helpText: "Theme default follows the website style. Choose another layout only when this page needs it.",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Image right", value: "media-right" },
        { label: "Image left", value: "media-left" },
        { label: "Centered", value: "centered" },
        { label: "Background image", value: "background" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "subtitle", label: "Subtitle", type: "textarea", rows: 4 },
    { id: "buttonText", label: "Primary Button", type: "text" },
    { id: "href", label: "Primary Link", type: "url" },
    { id: "secondaryButtonText", label: "Secondary Button", type: "text" },
    { id: "secondaryHref", label: "Secondary Link", type: "url" },
    { id: "bgImage", label: "Image", type: "image" },
    { id: "imageAlt", label: "Image Alt", type: "textarea", rows: 3 },
    { id: "imageCaption", label: "Image Caption", type: "text" },
  ],
  compositionRole: "section",
  presets: [
    {
      id: "theme-default",
      name: "Theme hero",
      description: "Use the opening composition recommended by the active website theme.",
      recommended: true,
      content: { layout: "theme" },
    },
    {
      id: "image-right",
      name: "Image right",
      description: "Message and actions on the left with a supporting image on the right.",
      content: { layout: "media-right" },
    },
    {
      id: "image-left",
      name: "Image left",
      description: "Supporting image on the left with the message and actions on the right.",
      content: { layout: "media-left" },
    },
    {
      id: "centered",
      name: "Centered hero",
      description: "A focused centered introduction with supporting media below.",
      content: { layout: "centered" },
    },
    {
      id: "background",
      name: "Background hero",
      description: "Place the message over an immersive full-width image.",
      content: { layout: "background" },
    },
  ],
} satisfies BlockDefinition;

export default heroBlock;
