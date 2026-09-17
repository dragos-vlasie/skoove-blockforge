import { z } from "zod";
import { BlockType } from "../../../types";
import { type BlockDefinition } from "../types";

export const sharedBlock = {
  type: BlockType.SHARED_BLOCK,
  label: "Shared Block",
  shortLabel: "S",
  order: 999,
  defaultContent: {
    refId: "",
  },
  schema: z
    .object({
      refId: z.string(),
    })
    .passthrough(),
  fields: [
    { id: "refId", label: "Shared Block", type: "text" },
  ],
} satisfies BlockDefinition;

export default sharedBlock;
