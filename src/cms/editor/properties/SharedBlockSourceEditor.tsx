import { blockDefinitions, cloneDefaultBlockContent } from "../../../blocks/registry";
import { BlockManualFields } from "../../blockEditor";
import { blockLabels } from "../../constants";
import { createId } from "../../contentUtils";
import { appendFieldPath, nestedBlockFieldPrefix, sharedBlockFieldPrefix } from "../../fieldNavigation";
import { Field, selectChromeClass } from "../../ui";
import { normalizeTwoColumnColumns } from "../twoColumnUtils";
import { BlockType, type AssetMeta, type BlockData } from "../../../../types";

const editableNestedBlockDefinitions = blockDefinitions.filter((definition) =>
  definition.type !== BlockType.SHARED_BLOCK &&
  definition.type !== BlockType.TWO_COLUMN &&
  (definition.compositionRole === "content" || definition.compositionRole === "both")
);

export function SharedBlockSourceEditor({
  sharedBlockId,
  block,
  assets,
  onUploadAsset,
  onPatch,
  onFocusField,
  activeFieldPath,
}: {
  sharedBlockId: string;
  block: BlockData;
  assets: AssetMeta[];
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onPatch: (updater: (block: BlockData) => void) => void;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
}) {
  const sourcePrefix = sharedBlockFieldPrefix(sharedBlockId);

  if (block.type !== BlockType.TWO_COLUMN) {
    return (
      <BlockManualFields
        block={block}
        onPatch={onPatch}
        assets={assets}
        onUploadAsset={onUploadAsset}
        onFocusField={onFocusField}
        activeFieldPath={activeFieldPath}
        fieldPathPrefix={sourcePrefix}
      />
    );
  }

  const columns = normalizeTwoColumnColumns(block.content ?? {});
  const patchContent = (updater: (content: Record<string, any>) => void) => {
    onPatch((draft) => {
      const content = {
        ...(draft.content ?? {}),
        columns: normalizeTwoColumnColumns(draft.content ?? {}),
      };
      updater(content);
      draft.content = content;
    });
  };
  const patchNestedBlock = (columnIndex: number, nestedBlockId: string, updater: (block: BlockData) => void) => {
    patchContent((content) => {
      const nextColumns = normalizeTwoColumnColumns(content);
      const nestedBlock = nextColumns[columnIndex]?.blocks.find((candidate) => candidate.id === nestedBlockId);
      if (!nestedBlock) return;
      updater(nestedBlock);
      content.columns = nextColumns;
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
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
              type="button"
              key={value}
              onClick={() => patchContent((content) => { content.layout = value; })}
              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                block.content?.layout === value || (!block.content?.layout && value === "split")
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Field label="Gap">
            <select className={selectChromeClass} value={block.content?.gap ?? "lg"} onChange={(event) => patchContent((content) => { content.gap = event.target.value; })}>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </Field>
          <Field label="Padding">
            <select className={selectChromeClass} value={block.content?.padding ?? "lg"} onChange={(event) => patchContent((content) => { content.padding = event.target.value; })}>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">Extra Large</option>
            </select>
          </Field>
        </div>
      </div>

      {columns.map((column, columnIndex) => (
        <div key={column.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-950">{column.label}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{column.blocks.length} component{column.blocks.length === 1 ? "" : "s"}</p>
            </div>
            <select
              className={`${selectChromeClass} max-w-[132px]`}
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                const type = event.target.value as BlockType;
                patchContent((content) => {
                  const nextColumns = normalizeTwoColumnColumns(content);
                  nextColumns[columnIndex].blocks.push({
                    id: createId("nested-block"),
                    type,
                    content: cloneDefaultBlockContent(type),
                  });
                  content.columns = nextColumns;
                });
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
            {column.blocks.map((nestedBlock) => {
              const fieldPrefix = appendFieldPath(sourcePrefix, nestedBlockFieldPrefix(column.id, nestedBlock.id));
              return (
                <div key={nestedBlock.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-slate-950">{blockLabels[nestedBlock.type] ?? nestedBlock.type}</p>
                    <button
                      type="button"
                      onClick={() => patchContent((content) => {
                        const nextColumns = normalizeTwoColumnColumns(content);
                        nextColumns[columnIndex].blocks = nextColumns[columnIndex].blocks.filter((candidate) => candidate.id !== nestedBlock.id);
                        content.columns = nextColumns;
                      })}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                  <BlockManualFields
                    block={nestedBlock}
                    onPatch={(updater) => patchNestedBlock(columnIndex, nestedBlock.id, updater)}
                    assets={assets}
                    onUploadAsset={onUploadAsset}
                    onFocusField={onFocusField}
                    activeFieldPath={activeFieldPath}
                    fieldPathPrefix={fieldPrefix}
                  />
                </div>
              );
            })}
            {column.blocks.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-500">
                Add a component to this column.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
