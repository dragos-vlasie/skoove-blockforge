import { getBlockDefinition } from "../../../blocks/registry";
import { BlockContentFields } from "../../blockEditor";
import { BlockType, type AssetMeta, type BlockData, type CollectionEntry, type ContentGraph, type PageContent } from "../../../../types";
import { BlockActions } from "./BlockActions";
import type { BlockActionHandlers } from "./types";
import { PropertySection } from "./PropertySection";

export function StandardBlockPropertiesPanel({
  graph,
  item,
  selectedBlock,
  onPatchBlock,
  onUploadAsset,
  onOpenSharedBlockDialog,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onFocusField,
  activeFieldPath,
}: BlockActionHandlers & {
  graph: ContentGraph;
  item: PageContent | CollectionEntry;
  selectedBlock: BlockData;
  onPatchBlock: (blockId: string, updater: (block: BlockData) => void) => void;
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onOpenSharedBlockDialog: (block: BlockData) => void;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
}) {
  const definition = getBlockDefinition(selectedBlock.type, graph.site.clientExtensions);
  const appearanceFields = definition?.fields.filter((field) => field.id === "presentation") ?? [];
  const hasTextBlockTitle = String(selectedBlock.content?.title ?? "").trim().length > 0;
  const contentFields = definition?.fields.filter(
    (field) =>
      field.id !== "presentation" &&
      !(selectedBlock.type === BlockType.TEXT && field.id === "title" && !hasTextBlockTitle),
  ) ?? [];
  const updateContent = (fieldId: string, value: unknown) => {
    onPatchBlock(selectedBlock.id, (draft) => {
      draft.content = { ...draft.content, [fieldId]: value };
    });
  };

  return (
    <div className="min-w-0 space-y-3">
      {contentFields.length > 0 && (
        <div className="min-w-0">
          <BlockContentFields
            fields={contentFields}
            content={selectedBlock.content ?? {}}
            onChange={updateContent}
            assets={graph.assets}
            onUploadAsset={onUploadAsset}
            onFocusField={onFocusField}
            activeFieldPath={activeFieldPath}
          />
        </div>
      )}
      {appearanceFields.length > 0 && (
        <PropertySection title="Appearance" description="Presentation options" collapsible defaultOpen={false}>
          <BlockContentFields
            fields={appearanceFields}
            content={selectedBlock.content ?? {}}
            onChange={updateContent}
            assets={graph.assets}
            onUploadAsset={onUploadAsset}
            onFocusField={onFocusField}
            activeFieldPath={activeFieldPath}
          />
        </PropertySection>
      )}
      <div className="border-t border-slate-200 pt-3">
        <button
          onClick={() => onOpenSharedBlockDialog(selectedBlock)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
        >
          <span>Save as reusable section</span>
          <span aria-hidden="true">＋</span>
        </button>
        <div className="mt-2 flex flex-wrap gap-1.5 xl:hidden">
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
