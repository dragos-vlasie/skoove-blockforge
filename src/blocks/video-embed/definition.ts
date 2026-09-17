import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const videoEmbedBlock = {
  type: BlockType.VIDEO_EMBED,
  label: "Video Embed",
  shortLabel: "V",
  category: "Media",
  order: 45,
  defaultContent: {
    presentation: "theme",
    title: "Featured video",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    provider: "youtube",
    caption: "",
    aspectRatio: "16:9",
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "framed", "full-bleed", "minimal"]).default("theme"),
      title: optionalString,
      embedUrl: z.string(),
      provider: optionalString,
      caption: optionalString,
      aspectRatio: optionalString,
      iframeHtml: optionalString,
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Framed video", value: "framed" },
        { label: "Full bleed", value: "full-bleed" },
        { label: "Minimal", value: "minimal" },
      ],
    },
    { id: "title", label: "Title", type: "text" },
    {
      id: "embedUrl",
      label: "Embed URL or iframe code",
      type: "textarea",
      rows: 3,
      placeholder: "https://www.youtube.com/watch?v=... or <iframe src=\"...\"></iframe>",
    },
    { id: "caption", label: "Caption", type: "textarea", rows: 3 },
    { id: "provider", label: "Provider", type: "text", placeholder: "youtube, vimeo, videopress, iframe" },
    { id: "aspectRatio", label: "Aspect Ratio", type: "text", placeholder: "16:9" },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme video", description: "Video treatment recommended by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "framed", name: "Framed video", description: "A contained video with a strong visual frame.", content: { presentation: "framed" } },
    { id: "full-bleed", name: "Wide video", description: "A large, edge-focused presentation for visual stories.", content: { presentation: "full-bleed" } },
    { id: "minimal", name: "Minimal video", description: "A quiet embed for editorial content.", content: { presentation: "minimal" } },
  ],
} satisfies BlockDefinition;

export default videoEmbedBlock;
