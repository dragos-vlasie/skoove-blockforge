import { useEffect, useMemo, useRef, useState } from "react";
import { BlockRenderer } from "../../../components/BlockLibrary";
import {
  BlockType,
  type BlockTypeId,
  type BlockData,
  type CollectionEntry,
  type ContentGraph,
  type PageContent,
  type SharedBlock,
} from "../../../types";
import type { BlockDefinition, BlockPresetDefinition } from "../../blocks/types";
import { getBlockPackRegistration } from "../../packs/registry";
import { blockLabels } from "../constants";
import { SvgIcon, type IconName } from "../icons";
import { CmsDialog } from "../primitives/CmsDialog";
import { PreviewFrame } from "./PreviewFrame";
import { createPreviewThemeStyle } from "./previewTheme";

type SectionPickerGroup = {
  category: string;
  definitions: BlockDefinition[];
};

type SectionPickerProps = {
  open: boolean;
  groups: SectionPickerGroup[];
  sharedBlocks: SharedBlock[];
  graph: ContentGraph;
  subject: PageContent | CollectionEntry | null;
  insertLabel?: string;
  onAddSection: (type: BlockTypeId, initialContent?: Record<string, unknown>) => void;
  onAddSharedSection: (sharedBlockId: string) => void;
  onClose: () => void;
};

type PickerSelection =
  | { kind: "definition"; id: BlockTypeId }
  | { kind: "shared"; id: string };

type PreviewDevice = "desktop" | "tablet" | "mobile";

const deviceWidths: Record<PreviewDevice, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

const previewDevices: Array<{
  id: PreviewDevice;
  label: string;
  icon: "desktop" | "mobile";
}> = [
  { id: "desktop", label: "Desktop", icon: "desktop" },
  { id: "tablet", label: "Tablet", icon: "desktop" },
  { id: "mobile", label: "Mobile", icon: "mobile" },
];

const iconByType: Partial<Record<BlockType, IconName>> = {
  [BlockType.HERO]: "hero",
  [BlockType.MEDIA]: "image",
  [BlockType.RENTAL_HERO]: "hero",
  [BlockType.TEXT]: "textBlock",
  [BlockType.FEATURES]: "featureGrid",
  [BlockType.RENTAL_FEATURES]: "featureGrid",
  [BlockType.LOGO_CLOUD]: "shared",
  [BlockType.FEATURE_BENTO]: "cardGrid",
  [BlockType.IMAGE_TEXT]: "image",
  [BlockType.RENTAL_IMAGE_TEXT]: "image",
  [BlockType.TESTIMONIALS]: "textBlock",
  [BlockType.PRICING]: "cardGrid",
  [BlockType.BLOG_GRID]: "content",
  [BlockType.CONTACT_FORM]: "content",
  [BlockType.IMAGE_GALLERY]: "image",
  [BlockType.VIDEO_EMBED]: "video",
  [BlockType.TABLE]: "table",
  [BlockType.TWO_COLUMN]: "columns",
  [BlockType.STATS]: "chart",
  [BlockType.FAQ]: "accordion",
  [BlockType.UI_ACCORDION]: "accordion",
  [BlockType.UI_TABS]: "tabs",
  [BlockType.UI_CARD_GRID]: "cardGrid",
  [BlockType.UI_BUTTON_CTA]: "buttonCta",
  [BlockType.CTA]: "cta",
  [BlockType.RENTAL_CTA]: "cta",
  [BlockType.RENTAL_ABOUT]: "textBlock",
  [BlockType.RENTAL_PROBLEM]: "content",
};

const getBlockIcon = (type: BlockTypeId): IconName =>
  getBlockPackRegistration(type)?.registration.visualKind
  ?? iconByType[type as BlockType]
  ?? "collections";

const selectionKey = (selection: PickerSelection) => `${selection.kind}:${selection.id}`;

function categoryIconTone(category: string) {
  if (category === "Shared UI") return "bg-cyan-50 text-cyan-700 ring-cyan-100";
  if (category === "Shared blocks") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function LibraryRow({
  label,
  meta,
  category,
  icon,
  selected,
  added,
  onSelect,
}: {
  label: string;
  meta: string;
  category: string;
  icon: IconName;
  selected: boolean;
  added: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 ${
        selected
          ? "border-violet-300 bg-violet-50/80 shadow-sm"
          : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${
        selected ? "bg-white text-violet-700 ring-violet-200" : categoryIconTone(category)
      }`}>
        <SvgIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold tracking-[-0.02em] text-slate-950">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{meta}</span>
      </span>
      {added ? (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700" title="Recently added">
          <SvgIcon name="check" className="h-4 w-4" />
        </span>
      ) : (
        <span className={`text-lg transition ${selected ? "text-violet-600" : "text-slate-300 group-hover:text-slate-500"}`} aria-hidden="true">›</span>
      )}
    </button>
  );
}

function ComponentLibraryPanel({
  groups,
  sharedBlocks,
  categories,
  query,
  activeCategory,
  selectedKey,
  lastAddedKey,
  visibleSectionCount,
  onQueryChange,
  onCategoryChange,
  onSelect,
}: {
  groups: SectionPickerGroup[];
  sharedBlocks: SharedBlock[];
  categories: string[];
  query: string;
  activeCategory: string;
  selectedKey: string | null;
  lastAddedKey: string | null;
  visibleSectionCount: number;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSelect: (selection: PickerSelection) => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white" aria-label="Available sections">
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_8.5rem] gap-2 border-b border-slate-200 px-3 py-2.5">
        <div className="relative min-w-0">
          <label className="sr-only" htmlFor="section-library-search">Search components</label>
          <SvgIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="section-library-search"
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search components…"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </div>
        <label className="sr-only" htmlFor="section-library-category">Filter by category</label>
        <select
          id="section-library-category"
          value={activeCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="h-10 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        >
          {categories.map((category) => (
            <option value={category} key={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2.5">
        {groups.map((group) => (
          <section key={group.category} className="mb-4 last:mb-0">
            <div className="mb-1.5 flex items-center justify-between px-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{group.category}</h3>
              <span className="text-[10px] font-semibold text-slate-400">{group.definitions.length}</span>
            </div>
            <div className="space-y-1">
              {group.definitions.map((definition) => {
                const key = selectionKey({ kind: "definition", id: definition.type });
                return (
                  <LibraryRow
                    key={definition.type}
                    label={definition.label}
                    meta={definition.presets?.length
                      ? `${definition.presets.length} recommended variation${definition.presets.length === 1 ? "" : "s"}`
                      : `${definition.fields.length} editable field${definition.fields.length === 1 ? "" : "s"}`}
                    category={definition.category || "General"}
                    icon={getBlockIcon(definition.type)}
                    selected={selectedKey === key}
                    added={lastAddedKey === key}
                    onSelect={() => onSelect({ kind: "definition", id: definition.type })}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {sharedBlocks.length > 0 && (
          <section className="mb-4 last:mb-0">
            <div className="mb-1.5 flex items-center justify-between px-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Shared sections</h3>
              <span className="text-[10px] font-semibold text-emerald-600">{sharedBlocks.length}</span>
            </div>
            <div className="space-y-1">
              {sharedBlocks.map((sharedBlock) => {
                const key = selectionKey({ kind: "shared", id: sharedBlock.id });
                return (
                  <LibraryRow
                    key={sharedBlock.id}
                    label={sharedBlock.name}
                    meta={`Reusable ${blockLabels[sharedBlock.block.type] ?? "section"}`}
                    category="Shared blocks"
                    icon="shared"
                    selected={selectedKey === key}
                    added={lastAddedKey === key}
                    onSelect={() => onSelect({ kind: "shared", id: sharedBlock.id })}
                  />
                );
              })}
            </div>
          </section>
        )}

        {visibleSectionCount === 0 && (
          <div className="grid min-h-56 place-items-center px-6 text-center">
            <div>
              <p className="text-sm font-bold text-slate-700">No matching components</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Try another search or category.</p>
            </div>
          </div>
        )}
      </div>

    </section>
  );
}

function SectionPreviewPanel({
  graph,
  subject,
  block,
  label,
  meta,
  added,
  presets,
  selectedPresetId,
  showBack,
  onBack,
  onPresetChange,
  onAdd,
}: {
  graph: ContentGraph;
  subject: PageContent | CollectionEntry | null;
  block: BlockData | null;
  label: string;
  meta: string;
  added: boolean;
  presets: BlockPresetDefinition[];
  selectedPresetId: string;
  showBack: boolean;
  onBack: () => void;
  onPresetChange: (presetId: string) => void;
  onAdd: () => void;
}) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const previewWidth = deviceWidths[device];
  const previewScale = viewportWidth > 0
    ? Math.min(1, Math.max(0.25, (viewportWidth - 1) / previewWidth))
    : 0.5;
  const previewThemeStyle = createPreviewThemeStyle(graph.site);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateWidth = () => setViewportWidth(viewport.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [block?.type, device, selectedPresetId]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-slate-50" aria-label="Section preview">
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600"
              aria-label="Back to component list"
            >
              <span aria-hidden="true">←</span>
            </button>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-bold tracking-[-0.02em] text-slate-950">{label}</h3>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{meta}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-between">
          {presets.length > 0 && (
            <label className="min-w-0">
              <span className="sr-only">Component variation</span>
              <select
                value={selectedPresetId}
                onChange={(event) => onPresetChange(event.target.value)}
                className="h-9 max-w-44 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 max-sm:max-w-[13rem]"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.recommended ? `${preset.name} · Recommended` : preset.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {previewDevices.map((previewDevice) => (
              <button
                key={previewDevice.id}
                type="button"
                onClick={() => setDevice(previewDevice.id)}
                aria-label={`${previewDevice.label} component preview`}
                aria-pressed={device === previewDevice.id}
                className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-[10px] font-bold transition ${
                  device === previewDevice.id
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                <SvgIcon name={previewDevice.icon} className="h-4 w-4" />
                <span className="sr-only">{previewDevice.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto bg-white">
        {block ? (
          <div
            className="flex min-h-full justify-center"
            style={{ minWidth: `${previewWidth * previewScale}px` }}
          >
            <PreviewFrame
              expandToContent
              label={`${label} ${device} preview`}
              width={previewWidth}
              scale={previewScale}
              themeDesign={graph.site.design}
              themeStyle={previewThemeStyle}
              themeId={graph.site.design?.themeId}
            >
              <BlockRenderer
                block={block}
                sharedBlocks={graph.sharedBlocks}
                graph={graph}
                subject={subject ?? undefined}
              />
            </PreviewFrame>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm font-bold text-slate-700">Choose a component</p>
              <p className="mt-1 text-xs text-slate-500">Its live preview will appear here.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 sm:px-4">
        <p aria-live="polite" className="min-w-0 truncate text-[11px] font-medium text-slate-500 max-sm:hidden">
          {added ? "Added. You can add another copy or choose a different component." : "Preview before adding it to the page."}
        </p>
        <button
          type="button"
          onClick={onAdd}
          disabled={!block}
          className="min-h-9 shrink-0 rounded-lg bg-violet-600 px-4 text-[12px] font-bold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:bg-slate-300 max-sm:w-full"
        >
          {added ? "Add another" : "Add section"}
        </button>
      </div>
    </section>
  );
}

export function SectionPicker({
  open,
  groups,
  sharedBlocks,
  graph,
  subject,
  insertLabel,
  onAddSection,
  onAddSharedSection,
  onClose,
}: SectionPickerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selection, setSelection] = useState<PickerSelection | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [compactLayout, setCompactLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );
  const normalizedQuery = query.trim().toLowerCase();
  const categories = useMemo(
    () => Array.from(new Set(["All", ...groups.map((group) => group.category), ...(sharedBlocks.length > 0 ? ["Shared blocks"] : [])])),
    [groups, sharedBlocks.length],
  );
  const filteredGroups = useMemo(
    () =>
      groups
        .filter((group) => activeCategory === "All" || group.category === activeCategory)
        .map((group) => ({
          ...group,
          definitions: group.definitions.filter((definition) =>
            [
              definition.label,
              definition.shortLabel,
              definition.category,
              String(definition.type),
              ...(definition.presets ?? []).flatMap((preset) => [preset.name, preset.description]),
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
          ),
        }))
        .filter((group) => group.definitions.length > 0),
    [activeCategory, groups, normalizedQuery],
  );
  const filteredSharedBlocks = useMemo(
    () =>
      activeCategory !== "All" && activeCategory !== "Shared blocks"
        ? []
        : sharedBlocks.filter((sharedBlock) =>
            [sharedBlock.name, blockLabels[sharedBlock.block.type], String(sharedBlock.block.type)]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
          ),
    [activeCategory, normalizedQuery, sharedBlocks],
  );
  const visibleSelections = useMemo(
    () => [
      ...filteredGroups.flatMap((group) =>
        group.definitions.map((definition) => ({ kind: "definition", id: definition.type }) as PickerSelection),
      ),
      ...filteredSharedBlocks.map((sharedBlock) => ({ kind: "shared", id: sharedBlock.id }) as PickerSelection),
    ],
    [filteredGroups, filteredSharedBlocks],
  );
  const visibleSectionCount = visibleSelections.length;
  const totalSectionCount = groups.reduce((count, group) => count + group.definitions.length, 0) + sharedBlocks.length;
  const selectedKey = selection ? selectionKey(selection) : null;
  const selectedDefinition = selection?.kind === "definition"
    ? groups.flatMap((group) => group.definitions).find((definition) => definition.type === selection.id)
    : null;
  const selectedSharedBlock = selection?.kind === "shared"
    ? sharedBlocks.find((sharedBlock) => sharedBlock.id === selection.id)
    : null;
  const selectedPresets = selectedDefinition?.presets ?? [];
  const selectedPreset = selectedPresets.find((preset) => preset.id === selectedPresetId)
    ?? selectedPresets.find((preset) => preset.recommended)
    ?? selectedPresets[0];
  const insertionContent = selectedDefinition
    ? {
        ...selectedDefinition.defaultContent,
        ...(selectedPreset?.content ?? {}),
      }
    : null;
  const previewBlock: BlockData | null = selectedDefinition
    ? {
        id: `section-picker-preview-${selectedDefinition.type}`,
        type: selectedDefinition.type,
        content: {
          ...insertionContent,
          ...(selectedDefinition.previewContent ?? {}),
        },
      }
    : selectedSharedBlock?.block ?? null;
  const previewLabel = selectedDefinition?.label || selectedSharedBlock?.name || "Component preview";
  const previewMeta = selectedDefinition
    ? selectedPreset?.description
      ?? `${selectedDefinition.category || "General"} · ${selectedDefinition.fields.length} editable field${selectedDefinition.fields.length === 1 ? "" : "s"}`
    : selectedSharedBlock
      ? `Reusable ${blockLabels[selectedSharedBlock.block.type] ?? "section"}`
      : "Select a component from the library";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const updateLayout = () => setCompactLayout(media.matches);
    updateLayout();
    media.addEventListener("change", updateLayout);
    return () => media.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveCategory("All");
    setLastAddedKey(null);
    setSelectedPresetId("");
    setMobilePreviewOpen(false);
    const firstDefinition = groups[0]?.definitions[0];
    setSelection(
      firstDefinition
        ? { kind: "definition", id: firstDefinition.type }
        : sharedBlocks[0]
          ? { kind: "shared", id: sharedBlocks[0].id }
          : null,
    );
  }, [open]);

  useEffect(() => {
    const defaultPreset = selectedDefinition?.presets?.find((preset) => preset.recommended)
      ?? selectedDefinition?.presets?.[0];
    setSelectedPresetId(defaultPreset?.id ?? "");
  }, [selectedDefinition?.type]);

  useEffect(() => {
    if (!open || visibleSelections.length === 0) {
      if (open) setSelection(null);
      return;
    }
    if (!selection || !visibleSelections.some((candidate) => selectionKey(candidate) === selectionKey(selection))) {
      setSelection(visibleSelections[0]);
    }
  }, [open, selection, visibleSelections]);

  const chooseSelection = (nextSelection: PickerSelection) => {
    setSelection(nextSelection);
    if (compactLayout) setMobilePreviewOpen(true);
  };

  const addSelected = () => {
    if (!selection) return;
    if (selection.kind === "definition") onAddSection(selection.id, insertionContent ?? undefined);
    else onAddSharedSection(selection.id);
    setLastAddedKey(selectionKey(selection));
  };

  if (!open) return null;

  const showLibrary = !compactLayout || !mobilePreviewOpen;
  const showPreview = !compactLayout || mobilePreviewOpen;

  return (
    <CmsDialog
      open={open}
      onClose={onClose}
      title={(
        <span className="flex flex-wrap items-center gap-2">
          <span>Add section</span>
          {insertLabel && (
            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold tracking-normal text-violet-700">
              {insertLabel}
            </span>
          )}
          <span className="text-[11px] font-medium tracking-normal text-slate-500">
            {totalSectionCount} components
          </span>
        </span>
      )}
      maxWidthClassName="sm:!max-w-[90rem]"
      contentClassName="sm:!h-[90vh] sm:!w-[min(96vw,90rem)]"
      headerClassName="!px-4 !py-2"
      bodyClassName="!overflow-hidden p-0 sm:p-0"
    >
      <div className="grid h-full min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {showLibrary && (
          <div className="min-h-0 lg:border-r lg:border-slate-200">
            <ComponentLibraryPanel
              groups={filteredGroups}
              sharedBlocks={filteredSharedBlocks}
              categories={categories}
              query={query}
              activeCategory={activeCategory}
              selectedKey={selectedKey}
              lastAddedKey={lastAddedKey}
              visibleSectionCount={visibleSectionCount}
              onQueryChange={setQuery}
              onCategoryChange={setActiveCategory}
              onSelect={chooseSelection}
            />
          </div>
        )}
        {showPreview && (
          <div className="min-h-0">
            <SectionPreviewPanel
              graph={graph}
              subject={subject}
              block={previewBlock}
              label={previewLabel}
              meta={previewMeta}
              added={Boolean(selectedKey && selectedKey === lastAddedKey)}
              presets={selectedPresets}
              selectedPresetId={selectedPreset?.id ?? ""}
              showBack={compactLayout}
              onBack={() => setMobilePreviewOpen(false)}
              onPresetChange={setSelectedPresetId}
              onAdd={addSelected}
            />
          </div>
        )}
      </div>
    </CmsDialog>
  );
}
