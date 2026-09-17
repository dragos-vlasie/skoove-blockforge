import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

const tableRowSchema = z
  .object({
    cells: z.array(z.string()),
  })
  .passthrough();

export const tableBlock = {
  type: BlockType.TABLE,
  label: "Table",
  shortLabel: "T",
  category: "Content",
  order: 46,
  defaultContent: {
    presentation: "theme",
    caption: "Comparison table",
    headers: ["Feature", "Included"],
    rows: [
      { cells: ["Editable cells", "Yes"] },
      { cells: ["Responsive layout", "Yes"] },
    ],
    headersText: "Feature | Included",
    rowsText: "Editable cells | Yes\nResponsive layout | Yes",
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "striped", "bordered", "minimal"]).default("theme"),
      caption: optionalString,
      headers: z.array(z.string()).optional(),
      rows: z.array(tableRowSchema).optional(),
      headersText: optionalString,
      rowsText: optionalString,
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Striped rows", value: "striped" },
        { label: "Bordered cells", value: "bordered" },
        { label: "Minimal", value: "minimal" },
      ],
    },
    { id: "caption", label: "Caption", type: "text" },
    { id: "headersText", label: "Column Headers", type: "textarea", rows: 2, placeholder: "Feature | Included" },
    { id: "rowsText", label: "Rows", type: "textarea", rows: 8, placeholder: "Cell 1 | Cell 2\nCell 1 | Cell 2" },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme table", description: "Table treatment recommended by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "striped", name: "Striped table", description: "Alternating rows for scanning larger datasets.", content: { presentation: "striped" } },
    { id: "bordered", name: "Comparison table", description: "Clear cell boundaries for feature comparison.", content: { presentation: "bordered" } },
    { id: "minimal", name: "Minimal table", description: "A quiet table for editorial pages.", content: { presentation: "minimal" } },
  ],
} satisfies BlockDefinition;

export default tableBlock;
