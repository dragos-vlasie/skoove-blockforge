import { blockDefinitions } from "../../../blocks/registry";
import { BlockManualFields } from "../../blockEditor";
import { blockLabels } from "../../constants";
import { Field, selectChromeClass } from "../../ui";
import { nestedBlockFieldPrefix } from "../../fieldNavigation";
import { normalizeTwoColumnColumns } from "../twoColumnUtils";
import { BlockType, type AssetMeta, type BlockData, type CollectionEntry, type ContentGraph, type PageContent } from "../../../../types";
import { BlockActions } from "./BlockActions";
import type { BlockActionHandlers, TwoColumnActionHandlers } from "./types";

const editableNestedBlockDefinitions = blockDefinitions.filter((definition) =>
  definition.type !== BlockType.SHARED_BLOCK &&
  definition.type !== BlockType.TWO_COLUMN &&
  (definition.compositionRole === "content" || definition.compositionRole === "both")
);

export function TwoColumnBlockPropertiesPanel({
  graph,
  item,
  selectedBlock,
  onUploadAsset,
  onOpenSharedBlockDialog,
  patchTwoColumnContent,
  addNestedBlock,
  patchNestedBlock,
  removeNestedBlock,
  duplicateNestedBlock,
  moveNestedBlock,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onFocusField,
  activeFieldPath,
}: BlockActionHandlers & TwoColumnActionHandlers & {
  graph: ContentGraph;
  item: PageContent | CollectionEntry;
  selectedBlock: BlockData;
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onOpenSharedBlockDialog: (block: BlockData) => void;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
}) {
  const selectedTwoColumnColumns = normalizeTwoColumnColumns(selectedBlock.content ?? {});

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold leading-5 text-slate-950">Mixed-content composition</p>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Combine different Core components. The layout stacks safely on smaller screens.</p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700">
            Layout
          </span>
        </div>

        <div className="mt-3 grid gap-2.5">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Composition</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["split", "Equal split"],
                ["sidebar-left", "Wide right"],
                ["sidebar-right", "Wide left"],
                ["three-equal", "Three equal"],
                ["feature-left", "Feature left"],
                ["feature-right", "Feature right"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => patchTwoColumnContent(selectedBlock.id, (content) => { content.layout = value; })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                    selectedBlock.content?.layout === value || (!selectedBlock.content?.layout && value === "split")
                      ? "border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-violet-100"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Gap">
              <select
                className={selectChromeClass}
                value={selectedBlock.content?.gap ?? "lg"}
                onChange={(event) => patchTwoColumnContent(selectedBlock.id, (content) => { content.gap = event.target.value; })}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </Field>
            <Field label="Padding">
              <select
                className={selectChromeClass}
                value={selectedBlock.content?.padding ?? "lg"}
                onChange={(event) => patchTwoColumnContent(selectedBlock.id, (content) => { content.padding = event.target.value; })}
              >
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      {selectedTwoColumnColumns.map((column, columnIndex) => (
        <div key={column.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-slate-950">{column.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{column.blocks.length} block{column.blocks.length === 1 ? "" : "s"}</p>
            </div>
            <select
              className={`${selectChromeClass} max-w-[132px]`}
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                addNestedBlock(selectedBlock.id, columnIndex, event.target.value as BlockType);
                event.target.value = "";
              }}
            >
              <option value="">Add component</option>
              {editableNestedBlockDefinitions.map((definition) => (
                <option key={definition.type} value={definition.type}>{definition.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid gap-2.5">
            {column.blocks.map((nestedBlock, nestedIndex) => (
              <div key={nestedBlock.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-[11px] font-black text-white">
                      {blockLabels[nestedBlock.type]?.slice(0, 1) ?? "B"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-slate-950">{blockLabels[nestedBlock.type] ?? nestedBlock.type}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Component {nestedIndex + 1}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button disabled={nestedIndex === 0} onClick={() => moveNestedBlock(selectedBlock.id, columnIndex, nestedBlock.id, -1)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-500 disabled:opacity-30">Up</button>
                    <button disabled={nestedIndex === column.blocks.length - 1} onClick={() => moveNestedBlock(selectedBlock.id, columnIndex, nestedBlock.id, 1)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-500 disabled:opacity-30">Down</button>
                    <button onClick={() => duplicateNestedBlock(selectedBlock.id, columnIndex, nestedBlock.id)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-500">Copy</button>
                    <button onClick={() => removeNestedBlock(selectedBlock.id, columnIndex, nestedBlock.id)} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase text-rose-700">Remove</button>
                  </div>
                </div>
                <BlockManualFields
                  block={nestedBlock}
                  onPatch={(updater) => patchNestedBlock(selectedBlock.id, columnIndex, nestedBlock.id, updater)}
                  assets={graph.assets}
                  onUploadAsset={onUploadAsset}
                  onFocusField={onFocusField}
                  activeFieldPath={activeFieldPath}
                  fieldPathPrefix={nestedBlockFieldPrefix(column.id, nestedBlock.id)}
                />
              </div>
            ))}

            {column.blocks.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">
                Add text, media, proof, or an action to this area.
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <button
          onClick={() => onOpenSharedBlockDialog(selectedBlock)}
          className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
        >
          Save as shared
        </button>
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
    </div>
  );
}
