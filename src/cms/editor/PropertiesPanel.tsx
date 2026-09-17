import { useEffect, useRef } from "react";
import { SeoContentPanel, TechnicalContentPanel } from "../contentPanels";
import { blockLabels } from "../constants";
import { InlineIssueSummary } from "../ui";
import { BlockType } from "../../../types";
import { getBlockDefinition } from "../../blocks/registry";
import { DesignTokensPropertiesPanel } from "./properties/DesignTokensPropertiesPanel";
import { NavigationPropertiesPanel } from "./properties/NavigationPropertiesPanel";
import { SharedBlockPropertiesPanel } from "./properties/SharedBlockPropertiesPanel";
import { StandardBlockPropertiesPanel } from "./properties/StandardBlockPropertiesPanel";
import { TwoColumnBlockPropertiesPanel } from "./properties/TwoColumnBlockPropertiesPanel";
import type { PropertiesPanelProps, PropertiesPanelTab } from "./properties/types";

export type { PropertiesPanelTab } from "./properties/types";

export function PropertiesPanel({
  panel,
  graph,
  item,
  definition,
  selectedBlock,
  selectedGlobalComponent,
  currentBlockingIssues,
  issues,
  onSetPanel,
  onOpenAi,
  onChangeNavigation,
  onPatchGraph,
  onPatch,
  onPatchBlock,
  onUploadAsset,
  onManageSharedBlock,
  onDetachSharedBlockReference,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onDuplicateContent,
  onDeleteContent,
  onOpenSharedBlockDialog,
  patchTwoColumnContent,
  addNestedBlock,
  patchNestedBlock,
  removeNestedBlock,
  duplicateNestedBlock,
  moveNestedBlock,
  onFocusField,
  activeFieldPath,
  activeFieldSource,
  fieldNavigationRequest,
  onClose,
  onBackToPage,
}: PropertiesPanelProps & {
  onClose?: () => void;
  onBackToPage?: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const propertyTitle = selectedGlobalComponent
    ? selectedGlobalComponent === "header" ? "Header" : "Footer"
    : selectedBlock
      ? getBlockDefinition(selectedBlock.type, graph.site.clientExtensions)?.label ?? blockLabels[selectedBlock.type as BlockType] ?? selectedBlock.type
      : item?.title ?? "Page";
  const propertySubtitle = selectedGlobalComponent
    ? `Global component · ${selectedGlobalComponent === "header" ? "Site header" : "Site footer"}`
    : selectedBlock
      ? activeFieldSource?.fieldLabel
        ? `${activeFieldSource.fieldLabel} · ${activeFieldSource.fieldType}`
        : "Page section"
      : "Page settings";
  const propertyTabs: Array<[PropertiesPanelTab, string]> = selectedGlobalComponent || selectedBlock
    ? [["content", "Fields"]]
    : [
        ["content", "Fields"],
        ["technical", "Page"],
        ["seo", "SEO"],
        ["design", "Design"],
      ];
  const isStandardBlock = Boolean(
    selectedBlock && selectedBlock.type !== BlockType.SHARED_BLOCK && selectedBlock.type !== BlockType.TWO_COLUMN,
  );
  const activeAsset = activeFieldSource?.fieldType === "image"
    ? graph.assets.find((asset) => asset.id === activeFieldSource.previewValue || asset.url === activeFieldSource.previewValue)
    : null;
  const externalReference = activeFieldSource?.previewValue && /^https?:\/\//i.test(activeFieldSource.previewValue)
    ? activeFieldSource.previewValue
    : null;
  const sourceKindLabel = activeFieldSource?.sourceKind === "shared-block"
    ? "Shared source"
    : activeFieldSource?.sourceKind === "entry"
      ? "Entry field"
    : activeFieldSource?.sourceKind === "nested-block"
      ? "Nested block"
      : "Page content";

  useEffect(() => {
    if (!fieldNavigationRequest) return;

    let cancelled = false;
    let attempts = 0;
    let frameId = 0;

    const revealField = () => {
      if (cancelled) return;

      const target = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>("[data-cms-editor-field]") ?? [],
      ).find((element) => element.dataset.cmsEditorField === fieldNavigationRequest.path);

      if (!target && attempts < 12) {
        attempts += 1;
        frameId = window.requestAnimationFrame(revealField);
        return;
      }

      if (!target) return;

      const panel = panelRef.current;
      if (panel) {
        const panelRect = panel.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const targetTop = panel.scrollTop + targetRect.top - panelRect.top;
        const centeredTop = targetTop - Math.max(0, (panel.clientHeight - targetRect.height) / 2);
        panel.scrollTo({ top: Math.max(0, centeredTop), behavior: "smooth" });
      }
      frameId = window.requestAnimationFrame(() => {
        const focusTarget = target.querySelector<HTMLElement>(
          "input:not([type='hidden']), textarea, select, [contenteditable='true'], button",
        );
        focusTarget?.focus({ preventScroll: true });
      });
    };

    frameId = window.requestAnimationFrame(revealField);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [fieldNavigationRequest, panel, selectedBlock?.id]);

  return (
    <aside
      ref={panelRef}
      data-cms-properties-panel
      aria-label="Content properties"
      className="h-full min-h-0 min-w-0 overflow-y-auto border-l border-slate-200 bg-[#f8fafc] xl:border-l-0 xl:border-r"
    >
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {(selectedBlock || selectedGlobalComponent) && onBackToPage && (
              <button
                type="button"
                onClick={onBackToPage}
                title={`Back to ${item?.title ?? "page"}`}
                className="flex max-w-full items-center gap-1.5 rounded-md py-0.5 pr-2 text-left text-[10px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-violet-700"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-slate-100 text-xs" aria-hidden="true">←</span>
                <span className="truncate">Back to {item?.title ?? "page"}</span>
              </button>
            )}
            <div className={selectedBlock || selectedGlobalComponent ? "mt-1.5" : ""}>
              <h2 className="truncate text-[17px] font-bold tracking-[-0.025em] text-slate-950" title={propertyTitle}>{propertyTitle}</h2>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500" title={propertySubtitle}>{propertySubtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isStandardBlock && (
              <button
                type="button"
                onClick={onOpenAi}
                title="Open AI Assist"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[10px] font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              >
                <span aria-hidden="true">✦</span>
                AI
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close properties"
                className="cms-editor-properties-close hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-lg font-medium leading-none text-slate-500 shadow-sm transition hover:border-violet-300 hover:text-violet-700 sm:grid"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="-mx-4 flex items-center gap-5 overflow-x-auto border-b border-slate-200 bg-white px-4">
          {propertyTabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => onSetPanel(id)}
              data-testid={`panel-tab-${id}`}
              className={`border-b-2 px-0 pb-3 text-[12px] font-semibold transition ${
                panel === id ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <InlineIssueSummary issues={selectedGlobalComponent ? [] : currentBlockingIssues} title="Fix this content before publishing" />

        {panel === "content" && activeFieldSource && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 shadow-[0_1px_2px_rgba(76,29,149,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-950">{activeFieldSource.fieldLabel}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  {sourceKindLabel} · {activeFieldSource.fieldType}
                </p>
              </div>
              {activeFieldSource.locale && (
                <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-violet-700 shadow-sm">
                  {activeFieldSource.locale}
                </span>
              )}
            </div>
            {activeAsset && (
              <p className="mt-2 truncate text-[10px] font-semibold text-slate-600">
                Asset: {activeAsset.filename} · {activeAsset.storageProvider ?? (activeAsset.url.startsWith("/uploads/") ? "local" : "external")}
              </p>
            )}
            {externalReference && !activeAsset && (
              <button
                type="button"
                onClick={() => window.open(externalReference, "_blank", "noopener,noreferrer")}
                className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-violet-200 bg-white px-2 py-1 text-[10px] font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                <span className="truncate">Open external reference</span>
                <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>
        )}

        {panel === "content" && selectedGlobalComponent && (
          <NavigationPropertiesPanel
            graph={graph}
            selectedGlobalComponent={selectedGlobalComponent}
            onChangeNavigation={onChangeNavigation}
          />
        )}

        {panel === "content" && !selectedGlobalComponent && item && selectedBlock?.type === BlockType.SHARED_BLOCK && (
          <SharedBlockPropertiesPanel
            graph={graph}
            item={item}
            selectedBlock={selectedBlock}
            onPatchBlock={onPatchBlock}
            onPatchSharedBlock={(sharedBlockId, updater) => onPatchGraph((draft) => {
              const sharedBlock = draft.sharedBlocks.find((candidate) => candidate.id === sharedBlockId);
              if (!sharedBlock) return;
              updater(sharedBlock.block);
              sharedBlock.updatedAt = new Date().toISOString();
            })}
            onUploadAsset={onUploadAsset}
            onManageSharedBlock={onManageSharedBlock}
            onDetachSharedBlockReference={onDetachSharedBlockReference}
            onMoveBlock={onMoveBlock}
            onDuplicateBlock={onDuplicateBlock}
            onRemoveBlock={onRemoveBlock}
            onFocusField={onFocusField}
            activeFieldPath={activeFieldPath}
          />
        )}

        {panel === "content" && !selectedGlobalComponent && item && selectedBlock?.type === BlockType.TWO_COLUMN && (
          <TwoColumnBlockPropertiesPanel
            graph={graph}
            item={item}
            selectedBlock={selectedBlock}
            onUploadAsset={onUploadAsset}
            onOpenSharedBlockDialog={onOpenSharedBlockDialog}
            patchTwoColumnContent={patchTwoColumnContent}
            addNestedBlock={addNestedBlock}
            patchNestedBlock={patchNestedBlock}
            removeNestedBlock={removeNestedBlock}
            duplicateNestedBlock={duplicateNestedBlock}
            moveNestedBlock={moveNestedBlock}
            onMoveBlock={onMoveBlock}
            onDuplicateBlock={onDuplicateBlock}
            onRemoveBlock={onRemoveBlock}
            onFocusField={onFocusField}
            activeFieldPath={activeFieldPath}
          />
        )}

        {panel === "content" && !selectedGlobalComponent && item && selectedBlock && isStandardBlock && (
          <StandardBlockPropertiesPanel
            graph={graph}
            item={item}
            selectedBlock={selectedBlock}
            onPatchBlock={onPatchBlock}
            onUploadAsset={onUploadAsset}
            onOpenSharedBlockDialog={onOpenSharedBlockDialog}
            onMoveBlock={onMoveBlock}
            onDuplicateBlock={onDuplicateBlock}
            onRemoveBlock={onRemoveBlock}
            onFocusField={onFocusField}
            activeFieldPath={activeFieldPath}
          />
        )}

        {panel === "content" && !selectedGlobalComponent && item && !selectedBlock && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-600">
            Select or add a block to edit content.
          </div>
        )}

        {panel === "technical" && !selectedGlobalComponent && item && (
          <TechnicalContentPanel
            item={item}
            graph={graph}
            definition={definition}
            issues={issues}
            onPatch={onPatch}
            onDuplicate={onDuplicateContent}
            onDelete={onDeleteContent}
            onUploadAsset={onUploadAsset}
            onFocusField={onFocusField}
            activeFieldPath={activeFieldPath}
          />
        )}

        {panel === "seo" && !selectedGlobalComponent && item && (
          <SeoContentPanel
            item={item}
            graph={graph}
            definition={definition}
            issues={issues}
            onPatch={onPatch}
            onUploadAsset={onUploadAsset}
            onFocusField={onFocusField}
            activeFieldPath={activeFieldPath}
          />
        )}

        {panel === "design" && !selectedGlobalComponent && (
          <DesignTokensPropertiesPanel graph={graph} onPatchGraph={onPatchGraph} />
        )}
      </div>
    </aside>
  );
}
