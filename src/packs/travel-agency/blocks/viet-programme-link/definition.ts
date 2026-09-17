import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

export const vietProgrammeLinkBlock = {
  type: BlockType.TRAVEL_PROGRAMME_LINK, label: "Programme Link", shortLabel: "PL", category: "Travel Agency", order: 109,
  defaultContent: { label: "Trip document", title: "View the detailed tour programme", description: "Review the itinerary, included services, and useful information before travelling.", href: "", fileMeta: "PDF · Detailed programme" },
  schema: z.object({ label: optionalString, title: z.string(), description: optionalString, href: optionalString, fileMeta: optionalString }).passthrough(),
  fields: [{ id: "label", label: "Label", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "description", label: "Description", type: "textarea", rows: 3 }, { id: "href", label: "Programme File Link", type: "url" }, { id: "fileMeta", label: "File Meta", type: "text" }],
} satisfies BlockDefinition;
export default vietProgrammeLinkBlock;
