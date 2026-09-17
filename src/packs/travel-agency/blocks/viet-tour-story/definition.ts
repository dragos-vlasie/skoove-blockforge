import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

export const vietTourStoryBlock = {
  type: BlockType.TRAVEL_TOUR_STORY, label: "Tour Story", shortLabel: "ST", category: "Travel Agency", order: 110,
  defaultContent: { eyebrow: "Journey story", title: "A memorable moment along the way", body: "Tell the story of a landscape, person, or experience that gives this journey its distinctive character.", image: "", imageAlt: "A memorable moment from the journey", caption: "Image caption", imageSide: "left" },
  schema: z.object({ eyebrow: optionalString, title: z.string(), body: optionalString, image: optionalString, imageAlt: optionalString, caption: optionalString, imageSide: z.enum(["left", "right"]).optional() }).passthrough(),
  fields: [{ id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "body", label: "Story", type: "textarea", rows: 8 }, { id: "image", label: "Image", type: "image" }, { id: "imageAlt", label: "Image Alt", type: "text" }, { id: "caption", label: "Caption", type: "text" }, { id: "imageSide", label: "Image Side (left or right)", type: "text" }],
} satisfies BlockDefinition;
export default vietTourStoryBlock;
