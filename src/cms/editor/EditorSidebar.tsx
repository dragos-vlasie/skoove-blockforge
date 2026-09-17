import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { SortableBlockButton } from "../blockEditor";
import { blockLabels } from "../constants";
import { contentPath } from "../contentUtils";
import { SvgIcon } from "../icons";
import type { Selection } from "../types";
import type { CollectionEntry, ContentGraph, PageContent } from "../../../types";
import type { EditorLeftPanel, GlobalComponentId } from "./types";
import { getContentLocale } from "../../localization/registry";

type CurrentTemplate = {
  label: string;
  description: string;
} | null;

type EditorSidebarProps = {
  graph: ContentGraph;
  item: PageContent | CollectionEntry | null;
  activeBlockId: string | null;
  selectedGlobalComponent: GlobalComponentId | null;
  leftPanel: EditorLeftPanel;
  currentTemplate: CurrentTemplate;
  availableSectionCount: number;
  onSetLeftPanel: (panel: EditorLeftPanel) => void;
  onSelectContent: (selection: Selection) => void;
  onSelectBlock: (blockId: string | null) => void;
  onSelectGlobalComponent: (id: GlobalComponentId) => void;
  onOpenCreateContent: () => void;
  onOpenSectionPicker: () => void;
  onEditTemplate: () => void;
  onRemoveBlock: (blockId: string) => void;
  onReorderBlocks: (activeId: string, overId: string) => void;
  phoneVisible: boolean;
  sheetOpen: boolean;
  desktopOpen: boolean;
  onClose: () => void;
};

export function EditorSidebar({
  graph,
  item,
  activeBlockId,
  selectedGlobalComponent,
  leftPanel,
  currentTemplate,
  availableSectionCount,
  onSetLeftPanel,
  onSelectContent,
  onSelectBlock,
  onSelectGlobalComponent,
  onOpenCreateContent,
  onOpenSectionPicker,
  onEditTemplate,
  onRemoveBlock,
  onReorderBlocks,
  phoneVisible,
  sheetOpen,
  desktopOpen,
  onClose,
}: EditorSidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [filter, setFilter] = useState("");

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderBlocks(String(active.id), String(over.id));
  };

  return (
    <aside
        data-cms-editor-sidebar
        aria-label="Editor pages and sections"
        className={`${phoneVisible ? "flex" : "hidden"} group/sidebar h-[calc(100dvh-7.5rem)] min-h-0 w-full flex-col overflow-hidden border-r border-[#e4e7ec] bg-white ${
          sheetOpen
            ? "sm:fixed sm:bottom-0 sm:left-0 sm:top-14 sm:z-50 sm:flex sm:h-auto sm:w-80 sm:max-w-[calc(100vw-3rem)] sm:shadow-2xl"
            : "sm:hidden"
        } lg:relative lg:z-30 lg:flex lg:h-full lg:w-[72px] lg:max-w-[72px] lg:overflow-visible lg:border-r-0 lg:bg-transparent lg:shadow-none`}
      >
        <div className={`hidden h-full w-[72px] flex-col items-center border-r border-slate-200 bg-white py-3 transition-opacity duration-150 lg:flex ${
          desktopOpen
            ? "lg:pointer-events-none lg:opacity-0"
            : "lg:group-hover/sidebar:opacity-0 lg:group-focus-within/sidebar:opacity-0"
        }`}>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onSetLeftPanel("pages")}
              aria-label="Open pages"
              title="Pages"
              className={`grid h-11 w-11 place-items-center rounded-xl transition ${leftPanel === "pages" ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <SvgIcon name="content" className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => onSetLeftPanel("layers")}
              aria-label="Open layers"
              title="Layers"
              className={`grid h-11 w-11 place-items-center rounded-xl transition ${leftPanel === "layers" ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <SvgIcon name="collections" className="h-[18px] w-[18px]" />
            </button>
          </div>
          <span className="mt-3 text-slate-300" aria-hidden="true">
            <SvgIcon name="chevronRight" className="h-3.5 w-3.5" />
          </span>
          <button
            type="button"
            disabled={leftPanel === "layers" && (!item || availableSectionCount === 0)}
            onClick={() => {
              if (leftPanel === "pages") onOpenCreateContent();
              else if (item && availableSectionCount > 0) onOpenSectionPicker();
            }}
            aria-label={leftPanel === "pages" ? "Create page" : "Add section"}
            title={leftPanel === "pages" ? "Create page" : "Add section"}
            className="mt-auto grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40"
          >
            <SvgIcon name="plus" className="h-4 w-4" />
          </button>
        </div>

        <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-white lg:absolute lg:inset-y-0 lg:left-0 lg:w-72 lg:shadow-xl lg:transition-[opacity,transform] lg:duration-150 ${
          desktopOpen
            ? "lg:pointer-events-auto lg:translate-x-0 lg:opacity-100"
            : "lg:pointer-events-none lg:-translate-x-2 lg:opacity-0 lg:group-hover/sidebar:pointer-events-auto lg:group-hover/sidebar:translate-x-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:pointer-events-auto lg:group-focus-within/sidebar:translate-x-0 lg:group-focus-within/sidebar:opacity-100"
        }`}>
        <div className="shrink-0 border-b border-[#e4e7ec] px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#667085]">Website editor</p>
              <h1 className="mt-0.5 block max-w-full truncate text-[15px] font-extrabold tracking-[-0.03em] text-[#111827]">{item?.title ?? "Home"}</h1>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close pages and sections"
              className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#d9dee7] bg-white text-lg font-medium leading-none text-[#667085] shadow-sm transition hover:border-[#c7b8ff] hover:text-[#6d5dfc] sm:grid lg:hidden"
            >
              ×
            </button>
          </div>
        </div>

        <div className="shrink-0 px-3.5 py-2.5">
          <div role="tablist" aria-label="Editor side panel" className="grid grid-cols-2 rounded-lg border border-[#e4e7ec] bg-[#f6f7f9] p-0.5">
            <button
              role="tab"
              aria-selected={leftPanel === "pages"}
              onClick={() => onSetLeftPanel("pages")}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[12px] font-bold transition ${
                leftPanel === "pages" ? "bg-white text-[#172033] shadow-sm" : "text-[#667085] hover:bg-white/60 hover:text-[#172033]"
              }`}
            >
              Pages
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${leftPanel === "pages" ? "bg-[#f1ecff] text-[#6247ff]" : "bg-white text-[#98a2b3]"}`}>
                {graph.pages.length}
              </span>
            </button>
            <button
              role="tab"
              aria-selected={leftPanel === "layers"}
              onClick={() => onSetLeftPanel("layers")}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[12px] font-bold transition ${
                leftPanel === "layers" ? "bg-white text-[#172033] shadow-sm" : "text-[#667085] hover:bg-white/60 hover:text-[#172033]"
              }`}
            >
              Layers
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${leftPanel === "layers" ? "bg-[#f1ecff] text-[#6247ff]" : "bg-white text-[#98a2b3]"}`}>
                {(item?.blocks.length ?? 0) + 2}
              </span>
            </button>
          </div>
          <label className="mt-2 flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-500 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100">
            <SvgIcon name="search" className="h-3.5 w-3.5 shrink-0" />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={leftPanel === "pages" ? "Find page…" : "Find layer…"}
              className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-3 pt-0.5 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
          {leftPanel === "pages" ? (
            <PagesPanel
              graph={graph}
              item={item}
              selectedGlobalComponent={selectedGlobalComponent}
              filter={filter}
              onSelectContent={onSelectContent}
              onSelectBlock={onSelectBlock}
            />
          ) : (
            <LayersPanel
              item={item}
              activeBlockId={activeBlockId}
              selectedGlobalComponent={selectedGlobalComponent}
              currentTemplate={currentTemplate}
              filter={filter}
              sensors={sensors}
              handleDragEnd={handleDragEnd}
              onSelectBlock={onSelectBlock}
              onSelectGlobalComponent={onSelectGlobalComponent}
              onEditTemplate={onEditTemplate}
              onRemoveBlock={onRemoveBlock}
            />
          )}
        </div>

        <div className="shrink-0 border-t border-[#e4e7ec] bg-white p-2.5 shadow-[0_-8px_24px_rgba(16,24,40,.04)]">
          {desktopOpen && (
            <p className="mb-2 hidden rounded-lg bg-violet-50 px-2.5 py-2 text-center text-[10px] font-semibold leading-4 text-violet-700 lg:block">
              Click the canvas to collapse. Hover this rail to reopen.
            </p>
          )}
          {leftPanel === "pages" ? (
            <button
              onClick={onOpenCreateContent}
              data-testid="create-content-open"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-[12px] font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              <SvgIcon name="plus" className="h-3.5 w-3.5" />
              New page
            </button>
          ) : (
            <button
              disabled={!item || availableSectionCount === 0}
              onClick={() => {
                if (!item || availableSectionCount === 0) return;
                onOpenSectionPicker();
              }}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-[12px] font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40"
            >
              <SvgIcon name="plus" className="h-3.5 w-3.5" />
              Add section
            </button>
          )}
        </div>
        </div>
    </aside>
  );
}

function PagesPanel({
  graph,
  item,
  selectedGlobalComponent,
  filter,
  onSelectContent,
  onSelectBlock,
}: {
  graph: ContentGraph;
  item: PageContent | CollectionEntry | null;
  selectedGlobalComponent: GlobalComponentId | null;
  filter: string;
  onSelectContent: (selection: Selection) => void;
  onSelectBlock: (blockId: string | null) => void;
}) {
  const activeLocale = getContentLocale(item ?? undefined, graph.site);
  const normalizedFilter = filter.trim().toLowerCase();
  const localePages = graph.pages.filter(
    (page) => getContentLocale(page, graph.site).toLowerCase() === activeLocale.toLowerCase(),
  ).filter((page) => !normalizedFilter || `${page.title} ${contentPath(page, graph)}`.toLowerCase().includes(normalizedFilter));
  const localeEntries = graph.entries.filter(
    (entry) => getContentLocale(entry, graph.site).toLowerCase() === activeLocale.toLowerCase(),
  ).filter((entry) => !normalizedFilter || entry.title.toLowerCase().includes(normalizedFilter));
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#667085]">Site Pages</p>
          <span className="rounded-full bg-[#eef1f5] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#667085]">{localePages.length} Pages</span>
        </div>
        <div className="space-y-0.5">
          {localePages.map((page) => {
            const active = item?.id === page.id && !selectedGlobalComponent;
            return (
              <button
                key={page.id}
                onClick={() => {
                  onSelectContent({ kind: "page", id: page.id });
                  onSelectBlock(null);
                }}
                className={`grid w-full min-w-0 grid-cols-[20px_minmax(0,1fr)_minmax(0,78px)] items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left transition ${
                  active ? "bg-[#f1ecff] text-[#6247ff]" : "text-[#344054] hover:bg-[#f8fafc]"
                }`}
              >
                <SvgIcon name={page.slug === "" ? "home" : "content"} className="h-3.5 w-3.5" />
                <span className="min-w-0 truncate text-[12px] font-bold tracking-[-0.02em]">{page.title}</span>
                <span className={`min-w-0 truncate text-right text-[11px] font-semibold ${active ? "text-[#8875ff]" : "text-[#98a2b3]"}`}>{contentPath(page, graph)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {localeEntries.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#667085]">Collection Entries</p>
            <span className="rounded-full bg-[#eef1f5] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#667085]">{localeEntries.length} Items</span>
          </div>
          <div className="space-y-0.5">
            {localeEntries.map((entry) => {
              const entryDefinition = graph.collectionDefinitions.find((candidate) => candidate.id === entry.collectionId);
              const active = item?.id === entry.id && !selectedGlobalComponent;
              return (
                <button
                  key={entry.id}
                  onClick={() => {
                    onSelectContent({ kind: "entry", id: entry.id });
                    onSelectBlock(null);
                  }}
                  className={`grid w-full min-w-0 grid-cols-[20px_minmax(0,1fr)] items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left transition ${
                    active ? "bg-[#f1ecff] text-[#6247ff]" : "text-[#344054] hover:bg-[#f8fafc]"
                  }`}
                >
                  <SvgIcon name="content" className="h-3.5 w-3.5" />
                  <span className="min-w-0 overflow-hidden">
                    <span className="block truncate text-[12px] font-bold tracking-[-0.02em]">{entry.title}</span>
                    <span className={`mt-0.5 block truncate text-[10px] font-semibold ${active ? "text-[#8875ff]" : "text-[#667085]"}`}>
                      {entryDefinition?.singularName ?? "Entry"} · {contentPath(entry, graph, entryDefinition)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LayersPanel({
  item,
  activeBlockId,
  selectedGlobalComponent,
  currentTemplate,
  filter,
  sensors,
  handleDragEnd,
  onSelectBlock,
  onSelectGlobalComponent,
  onEditTemplate,
  onRemoveBlock,
}: {
  item: PageContent | CollectionEntry | null;
  activeBlockId: string | null;
  selectedGlobalComponent: GlobalComponentId | null;
  currentTemplate: CurrentTemplate;
  filter: string;
  sensors: ReturnType<typeof useSensors>;
  handleDragEnd: (event: DragEndEvent) => void;
  onSelectBlock: (blockId: string | null) => void;
  onSelectGlobalComponent: (id: GlobalComponentId) => void;
  onEditTemplate: () => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const normalizedFilter = filter.trim().toLowerCase();
  const visibleBlocks = item?.blocks.filter((block) =>
    !normalizedFilter || blockLabels[block.type].toLowerCase().includes(normalizedFilter)
  ) ?? [];

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#667085]">Page Structure</p>
          <span className="rounded-full bg-[#eef1f5] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#667085]">{(item?.blocks.length ?? 0) + 2} Sections</span>
        </div>
        <div className="space-y-0.5">
          <GlobalComponentButton
            id="header"
            label="Header"
            meta="Global navigation"
            active={selectedGlobalComponent === "header"}
            onSelect={() => {
              onSelectGlobalComponent("header");
            }}
          />
          {item && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleBlocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {visibleBlocks.map((block) => (
                    <SortableBlockButton
                      key={block.id}
                      block={block}
                      active={!selectedGlobalComponent && activeBlockId === block.id}
                      onSelect={() => {
                        onSelectBlock(block.id);
                      }}
                      onRemove={() => onRemoveBlock(block.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {!item && (
            <div className="rounded-lg border border-dashed border-[#d9dee7] bg-[#f8fafc] p-4 text-center text-[12px] font-semibold text-[#667085]">
              Select a page to see layers.
            </div>
          )}
          <GlobalComponentButton
            id="footer"
            label="Footer"
            meta="Global navigation"
            active={selectedGlobalComponent === "footer"}
            onSelect={() => {
              onSelectGlobalComponent("footer");
            }}
          />
          {item && visibleBlocks.length === 0 && normalizedFilter && (
            <p className="px-2 py-4 text-center text-[11px] font-medium text-slate-500">No matching layers.</p>
          )}
        </div>
      </div>

      {item && currentTemplate && (
        <details className="group rounded-lg border border-slate-200 bg-slate-50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[11px] font-bold text-slate-700">
            <span><span className="text-slate-400">Template · </span>{currentTemplate.label}</span>
            <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-slate-200 px-3 py-2.5">
            <p className="text-[10px] font-medium leading-4 text-slate-500">{currentTemplate.description}</p>
            <button onClick={onEditTemplate} className="mt-2 text-[10px] font-bold text-violet-700 hover:text-violet-900">Edit template settings →</button>
          </div>
        </details>
      )}
    </div>
  );
}

function GlobalComponentButton({
  id,
  label,
  meta,
  active,
  onSelect,
}: {
  id: GlobalComponentId;
  label: string;
  meta: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      data-testid={`global-navigation-${id}`}
      onClick={onSelect}
      className={`group grid w-full min-w-0 grid-cols-[16px_28px_minmax(0,1fr)_18px] items-center gap-2 overflow-hidden rounded-md py-1 pr-2 text-left transition ${
        active
          ? "bg-[#f1ecff] text-[#6247ff] ring-1 ring-[#c7b8ff]"
          : "text-[#344054] hover:bg-[#f8fafc]"
      }`}
    >
      <span className="grid place-items-center text-[#b3bdcc]">
        <SvgIcon name="grip" className="h-3 w-3" />
      </span>
      <span className={`grid h-7 w-7 place-items-center rounded-lg ${active ? "bg-[#6d5dfc] text-white" : "bg-[#f1f3f7] text-[#667085]"}`}>
        <SvgIcon name={id === "header" ? "desktop" : "collections"} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 overflow-hidden">
        <span className="block truncate text-[12px] font-extrabold tracking-[-0.02em]">{label}</span>
        <span className={`mt-0.5 block truncate text-[10px] font-semibold ${active ? "text-[#6247ff]" : "text-[#667085]"}`}>{meta}</span>
      </span>
      <span className={`text-[#98a2b3] transition ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`} aria-hidden="true">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
    </button>
  );
}
