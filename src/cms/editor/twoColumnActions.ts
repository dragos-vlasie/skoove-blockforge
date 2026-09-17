import { cloneBlockValue, cloneDefaultBlockContent } from "../../blocks/registry";
import { createId } from "../contentUtils";
import type { BlockType, BlockData } from "../../../types";
import { normalizeTwoColumnColumns } from "./twoColumnUtils";

type PatchBlock = (blockId: string, updater: (block: BlockData) => void) => void;

export type TwoColumnBlockActions = {
  patchTwoColumnContent: (blockId: string, updater: (content: Record<string, any>) => void) => void;
  addNestedBlock: (blockId: string, columnIndex: number, type: BlockType) => void;
  patchNestedBlock: (blockId: string, columnIndex: number, nestedBlockId: string, updater: (block: BlockData) => void) => void;
  removeNestedBlock: (blockId: string, columnIndex: number, nestedBlockId: string) => void;
  duplicateNestedBlock: (blockId: string, columnIndex: number, nestedBlockId: string) => void;
  moveNestedBlock: (blockId: string, columnIndex: number, nestedBlockId: string, direction: -1 | 1) => void;
};

export const createTwoColumnBlockActions = (onPatchBlock: PatchBlock): TwoColumnBlockActions => {
  const patchTwoColumnContent: TwoColumnBlockActions["patchTwoColumnContent"] = (blockId, updater) => {
    onPatchBlock(blockId, (draft) => {
      const content = {
        layout: draft.content?.layout ?? "split",
        gap: draft.content?.gap ?? "lg",
        padding: draft.content?.padding ?? "lg",
        columns: normalizeTwoColumnColumns(draft.content ?? {}),
      };

      updater(content);
      draft.content = content;
    });
  };

  const addNestedBlock: TwoColumnBlockActions["addNestedBlock"] = (blockId, columnIndex, type) => {
    patchTwoColumnContent(blockId, (content) => {
      const columns = normalizeTwoColumnColumns(content);
      columns[columnIndex].blocks = [
        ...columns[columnIndex].blocks,
        {
          id: createId("nested-block"),
          type,
          content: cloneDefaultBlockContent(type),
        },
      ];
      content.columns = columns;
    });
  };

  const patchNestedBlock: TwoColumnBlockActions["patchNestedBlock"] = (blockId, columnIndex, nestedBlockId, updater) => {
    patchTwoColumnContent(blockId, (content) => {
      const columns = normalizeTwoColumnColumns(content);
      const nestedBlock = columns[columnIndex].blocks.find((candidate) => candidate.id === nestedBlockId);
      if (!nestedBlock) return;
      updater(nestedBlock);
      content.columns = columns;
    });
  };

  const removeNestedBlock: TwoColumnBlockActions["removeNestedBlock"] = (blockId, columnIndex, nestedBlockId) => {
    patchTwoColumnContent(blockId, (content) => {
      const columns = normalizeTwoColumnColumns(content);
      columns[columnIndex].blocks = columns[columnIndex].blocks.filter((candidate) => candidate.id !== nestedBlockId);
      content.columns = columns;
    });
  };

  const duplicateNestedBlock: TwoColumnBlockActions["duplicateNestedBlock"] = (blockId, columnIndex, nestedBlockId) => {
    patchTwoColumnContent(blockId, (content) => {
      const columns = normalizeTwoColumnColumns(content);
      const nestedBlock = columns[columnIndex].blocks.find((candidate) => candidate.id === nestedBlockId);
      if (!nestedBlock) return;
      columns[columnIndex].blocks = [
        ...columns[columnIndex].blocks,
        {
          ...cloneBlockValue(nestedBlock),
          id: createId("nested-block"),
        },
      ];
      content.columns = columns;
    });
  };

  const moveNestedBlock: TwoColumnBlockActions["moveNestedBlock"] = (blockId, columnIndex, nestedBlockId, direction) => {
    patchTwoColumnContent(blockId, (content) => {
      const columns = normalizeTwoColumnColumns(content);
      const blocks = columns[columnIndex].blocks;
      const index = blocks.findIndex((candidate) => candidate.id === nestedBlockId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return;
      const nextBlocks = [...blocks];
      const [moved] = nextBlocks.splice(index, 1);
      nextBlocks.splice(nextIndex, 0, moved);
      columns[columnIndex].blocks = nextBlocks;
      content.columns = columns;
    });
  };

  return {
    patchTwoColumnContent,
    addNestedBlock,
    patchNestedBlock,
    removeNestedBlock,
    duplicateNestedBlock,
    moveNestedBlock,
  };
};
