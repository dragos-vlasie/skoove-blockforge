import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const logoCloudBlock = {
  type: BlockType.LOGO_CLOUD,
  label: "Logo Cloud",
  shortLabel: "L",
  category: "Marketing",
  order: 34,
  defaultContent: {
    presentation: "theme",
    eyebrow: "Trusted by growing teams",
    logos: [
      { name: "Northstar", src: "", href: "" },
      { name: "Outline" },
      { name: "Vertex" },
      { name: "Gather" },
      { name: "Monogram" },
    ],
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "strip", "grid", "monochrome"]).default("theme"),
      eyebrow: optionalString,
      logos: z.array(z.object({ name: z.string(), src: optionalString, href: optionalString }).passthrough()),
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Logo strip", value: "strip" },
        { label: "Logo grid", value: "grid" },
        { label: "Monochrome", value: "monochrome" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    {
      id: "logos",
      label: "Logos",
      type: "repeater",
      addLabel: "Add Logo",
      defaultItem: { name: "Company", src: "", href: "" },
      fields: [
        { id: "name", label: "Name", type: "text" },
        { id: "src", label: "Logo Image", type: "image" },
        { id: "href", label: "Website Link", type: "url" },
      ],
    },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme logo cloud", description: "Partner marks styled by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "strip", name: "Logo strip", description: "A compact horizontal trust strip.", content: { presentation: "strip" } },
    { id: "grid", name: "Logo grid", description: "More space for a larger partner collection.", content: { presentation: "grid" } },
    { id: "monochrome", name: "Monochrome logos", description: "Quiet marks that do not compete with page content.", content: { presentation: "monochrome" } },
  ],
} satisfies BlockDefinition;

export default logoCloudBlock;
