import type { BlockData, CollectionEntry, PageContent } from "../../../../types";
import type { BlockActionHandlers } from "./types";

function ActionButton({
  children,
  disabled,
  tone = "neutral",
  title,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  tone?: "neutral" | "danger";
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`h-8 rounded-md border px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] transition disabled:cursor-not-allowed disabled:opacity-35 ${
        tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
      }`}
    >
      {children}
    </button>
  );
}

export function BlockActions({
  item,
  block,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
}: BlockActionHandlers & {
  item: PageContent | CollectionEntry;
  block: BlockData;
}) {
  return (
    <>
      <ActionButton disabled={item.blocks[0]?.id === block.id} title="Move block up" onClick={() => onMoveBlock(block.id, -1)}>Up</ActionButton>
      <ActionButton disabled={item.blocks[item.blocks.length - 1]?.id === block.id} title="Move block down" onClick={() => onMoveBlock(block.id, 1)}>Down</ActionButton>
      <ActionButton title="Duplicate block" onClick={() => onDuplicateBlock(block.id)}>Copy</ActionButton>
      <ActionButton tone="danger" title="Delete section" onClick={() => onRemoveBlock(block.id)}>Delete</ActionButton>
    </>
  );
}
