import { blockLabels } from "../../constants";
import { selectChromeClass } from "../../ui";
import { BlockType, type BlockData, type CollectionEntry, type ContentGraph, type PageContent } from "../../../../types";
import { BlockActions } from "./BlockActions";
import { SharedBlockSourceEditor } from "./SharedBlockSourceEditor";
import type { BlockActionHandlers } from "./types";

export function SharedBlockPropertiesPanel({
  graph,
  item,
  selectedBlock,
  onPatchBlock,
  onManageSharedBlock,
  onDetachSharedBlockReference,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onPatchSharedBlock,
  onUploadAsset,
  onFocusField,
  activeFieldPath,
}: BlockActionHandlers & {
  graph: ContentGraph;
  item: PageContent | CollectionEntry;
  selectedBlock: BlockData;
  onPatchBlock: (blockId: string, updater: (block: BlockData) => void) => void;
  onManageSharedBlock: (sharedBlockId: string, fieldPath?: string) => void;
  onDetachSharedBlockReference: (blockId: string) => void;
  onPatchSharedBlock: (sharedBlockId: string, updater: (block: BlockData) => void) => void;
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<any>;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
}) {
  const selectedSharedBlock =
    selectedBlock.type === BlockType.SHARED_BLOCK
      ? graph.sharedBlocks.find((sharedBlock) => sharedBlock.id === selectedBlock.content?.refId)
      : null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-950">Linked shared block</p>
        <p className="mt-1 text-xs text-slate-500">Editing the shared block updates every page that uses it.</p>
        <select
          className={`${selectChromeClass} mt-3`}
          value={selectedBlock.content?.refId ?? ""}
          onChange={(event) => onPatchBlock(selectedBlock.id, (draft) => { draft.content = { refId: event.target.value }; })}
        >
          <option value="">Choose shared block</option>
          {graph.sharedBlocks.map((sharedBlock) => (
            <option key={sharedBlock.id} value={sharedBlock.id}>{sharedBlock.name}</option>
          ))}
        </select>
        {selectedSharedBlock && (
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Uses {blockLabels[selectedSharedBlock.block.type]}.
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            disabled={!selectedSharedBlock}
            onClick={() => selectedSharedBlock && onManageSharedBlock(selectedSharedBlock.id)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-40"
          >
            Open Library
          </button>
          <button
            disabled={!selectedSharedBlock}
            onClick={() => onDetachSharedBlockReference(selectedBlock.id)}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 disabled:opacity-40"
          >
            Detach Copy
          </button>
        </div>
      </div>
      {selectedSharedBlock && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-950">Editing shared source</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">Changes update every use of {selectedSharedBlock.name}.</p>
            </div>
            <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-violet-700">Shared</span>
          </div>
          <SharedBlockSourceEditor
            sharedBlockId={selectedSharedBlock.id}
            block={selectedSharedBlock.block}
            assets={graph.assets}
            onUploadAsset={onUploadAsset}
            onPatch={(updater) => onPatchSharedBlock(selectedSharedBlock.id, updater)}
            onFocusField={onFocusField}
            activeFieldPath={activeFieldPath}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 xl:hidden">
        <BlockActions
          item={item}
          block={selectedBlock}
          onMoveBlock={onMoveBlock}
          onDuplicateBlock={onDuplicateBlock}
          onRemoveBlock={onRemoveBlock}
        />
      </div>
    </div>
  );
}
