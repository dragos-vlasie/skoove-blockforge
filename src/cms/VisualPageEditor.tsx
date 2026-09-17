import { useEffect, useRef, useState, type FormEvent } from "react";
import { getBlockDefinitionsForPacks } from "../blocks/registry";
import { getBlockPackId } from "../packs/registry";
import { resolveEntryTemplateId, resolvePageTemplateId, templatesById } from "../templates/registry";
import { blockLabels } from "./constants";
import { contentPath } from "./contentUtils";
import { CmsRail } from "./CmsChrome";
import { TemplatePreview } from "./TemplatePreview";
import type { CmsTab, CreateContentInput, Selection } from "./types";
import { AiAssistantModal } from "./editor/AiAssistantModal";
import {
  CanvasToolbar,
  type PreviewDevice,
  type PreviewZoom,
} from "./editor/CanvasToolbar";
import { ContentBrowserModal } from "./editor/ContentBrowserModal";
import { CreateContentModal } from "./editor/CreateContentModal";
import { EditorNavigationSurface, getNavigationItemsForLocation } from "./editor/EditorNavigationSurface";
import { EditorSidebar } from "./editor/EditorSidebar";
import { EditorTopBar } from "./editor/EditorTopBar";
import { PropertiesPanel, type PropertiesPanelTab } from "./editor/PropertiesPanel";
import { PreviewFrame, type PreviewFrameHandle } from "./editor/PreviewFrame";
import { RemotePreviewFrame } from "./editor/RemotePreviewFrame";
import { createPreviewThemeStyle } from "./editor/previewTheme";
import { PublishReviewModal } from "./editor/PublishReviewModal";
import { SectionPicker } from "./editor/SectionPicker";
import { SharedBlockDialog, type SharedBlockDraft } from "./editor/SharedBlockDialog";
import { createTwoColumnBlockActions } from "./editor/twoColumnActions";
import type { GlobalComponentId } from "./editor/types";
import type { BlockInsertOptions } from "./useCmsController";
import { getContentLocale } from "../localization/registry";
import type { PreviewFieldSource } from "./fieldNavigation";
import type { PreviewFieldIntent } from "./fieldHighlight";
import type { CmsWorkspace } from "../lib/cms/workspaceTypes";
import {
  BlockType,
  type BlockTypeId,
  type BlockData,
  type CollectionDefinition,
  type CollectionEntry,
  type ContentGraph,
  type NavigationMenu,
  type PageContent,
  type ValidationIssue,
} from "../../types";

type EditorNavigationSnapshot = {
  selection: Selection | null;
  blockId: string | null;
  globalComponent: GlobalComponentId | null;
  fieldPath: string | null;
  fieldSource: PreviewFieldSource | null;
  panel: PropertiesPanelTab;
  device: PreviewDevice;
  zoom: PreviewZoom;
  frameScroll: { x: number; y: number };
  canvasScroll: { left: number; top: number };
};

const sidebarDiscoveryDismissalsKey = "blockforge.cms.sidebar-discovery-dismissals-v2";
const sidebarDiscoveryDismissalLimit = 3;

const readSidebarDiscoveryDismissals = () => {
  if (typeof window === "undefined") return 0;
  try {
    const value = Number.parseInt(window.localStorage.getItem(sidebarDiscoveryDismissalsKey) ?? "0", 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
};

const writeSidebarDiscoveryDismissals = (value: number) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(sidebarDiscoveryDismissalsKey, String(value));
  } catch {
    // Storage can be unavailable in restricted browser contexts; the editor still works without persistence.
  }
};

export function VisualPageEditor({
  workspace,
  graph,
  issues,
  selection,
  item,
  definition,
  selectedBlock,
  activeBlockId,
  message,
  isBusy,
  errorCount,
  onSetTab,
  onSelectContent,
  onSelectBlock,
  onCreatePage,
  onCreateEntry,
  onCreateTranslation,
  onSave,
  onPublish,
  onPublishPage,
  onPatchGraph,
  onPatch,
  onPatchBlock,
  onAddBlock,
  onAddSharedBlockReference,
  onUploadAsset,
  onSaveBlockAsShared,
  onDetachSharedBlockReference,
  onManageSharedBlock,
  onRemoveBlock,
  onDuplicateBlock,
  onMoveBlock,
  onReorderBlocks,
  onDuplicateContent,
  onDeleteContent,
  onChangeNavigation,
  onOpenWebsiteSetup,
  editorMode = "client",
  initialPanel,
  onInitialPanelConsumed,
}: {
  workspace: CmsWorkspace;
  graph: ContentGraph;
  issues: ValidationIssue[];
  selection: Selection | null;
  item: PageContent | CollectionEntry | null;
  definition?: CollectionDefinition | null;
  selectedBlock: BlockData | null;
  activeBlockId: string | null;
  message: string;
  isBusy: boolean;
  errorCount: number;
  onSetTab: (tab: CmsTab) => void;
  onSelectContent: (selection: Selection) => void;
  onSelectBlock: (blockId: string | null) => void;
  onCreatePage: (input?: CreateContentInput) => void;
  onCreateEntry: (definition: CollectionDefinition, input?: CreateContentInput) => void;
  onCreateTranslation: (locale: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onPublishPage: (pageId: string) => void;
  onPatchGraph: (updater: (graph: ContentGraph) => void) => void;
  onPatch: (updater: (item: PageContent | CollectionEntry) => void) => void;
  onPatchBlock: (blockId: string, updater: (block: BlockData) => void) => void;
  onAddBlock: (type: BlockTypeId, options?: BlockInsertOptions) => void;
  onAddSharedBlockReference: (sharedBlockId: string, options?: BlockInsertOptions) => void;
  onUploadAsset: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<any>;
  onSaveBlockAsShared: (blockId: string, name: string) => string | null;
  onDetachSharedBlockReference: (blockId: string) => void;
  onManageSharedBlock: (sharedBlockId: string, fieldPath?: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onReorderBlocks: (activeId: string, overId: string) => void;
  onDuplicateContent: () => void;
  onDeleteContent: () => void;
  onChangeNavigation: (navigation: NavigationMenu[]) => void;
  onOpenWebsiteSetup: () => void;
  editorMode?: "client" | "builder";
  initialPanel?: PropertiesPanelTab | null;
  onInitialPanelConsumed?: () => void;
}) {
  const [device, setDevice] = useState<PreviewDevice>(() => {
    if (typeof window === "undefined") return "desktop";
    if (window.matchMedia("(max-width: 639px)").matches) return "mobile";
    if (window.matchMedia("(max-width: 1023px)").matches) return "tablet";
    return "desktop";
  });
  const [previewZoom, setPreviewZoom] = useState<PreviewZoom>("fit");
  const [previewViewportWidth, setPreviewViewportWidth] = useState(0);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [phoneMode, setPhoneMode] = useState<"preview" | "sections" | "edit">("preview");
  const [sectionsSheetOpen, setSectionsSheetOpen] = useState(false);
  const [propertiesSheetOpen, setPropertiesSheetOpen] = useState(false);
  const [panel, setPanel] = useState<PropertiesPanelTab>(initialPanel ?? "content");
  const [aiOpen, setAiOpen] = useState(false);
  const [contentBrowserOpen, setContentBrowserOpen] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [sectionInsertOptions, setSectionInsertOptions] = useState<BlockInsertOptions | undefined>();
  const [leftPanel, setLeftPanel] = useState<"pages" | "layers">("pages");
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [selectedGlobalComponent, setSelectedGlobalComponent] = useState<GlobalComponentId | null>(null);
  const [createContentOpen, setCreateContentOpen] = useState(false);
  const [publishReviewOpen, setPublishReviewOpen] = useState(false);
  const [sharedBlockDraft, setSharedBlockDraft] = useState<SharedBlockDraft | null>(null);
  const [activeFieldPath, setActiveFieldPath] = useState<string | null>(null);
  const [activeFieldSource, setActiveFieldSource] = useState<PreviewFieldSource | null>(null);
  const [fieldNavigationRequest, setFieldNavigationRequest] = useState<{
    target: "block" | "item";
    blockId?: string;
    path: string;
    requestId: number;
  } | null>(null);
  const fieldNavigationSequence = useRef(0);
  const backHistoryRef = useRef<EditorNavigationSnapshot[]>([]);
  const forwardHistoryRef = useRef<EditorNavigationSnapshot[]>([]);
  const pendingNavigationRestoreRef = useRef<EditorNavigationSnapshot | null>(null);
  const [, setHistoryRevision] = useState(0);
  const previewScrollRegionRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<PreviewFrameHandle>(null);
  const desktopSidebarOpenRef = useRef(false);

  useEffect(() => {
    if (readSidebarDiscoveryDismissals() >= sidebarDiscoveryDismissalLimit) return;
    desktopSidebarOpenRef.current = true;
    setDesktopSidebarOpen(true);
  }, []);

  const dismissDesktopSidebar = () => {
    if (!desktopSidebarOpenRef.current) return;
    desktopSidebarOpenRef.current = false;
    setDesktopSidebarOpen(false);
    const nextDismissals = Math.min(readSidebarDiscoveryDismissals() + 1, sidebarDiscoveryDismissalLimit);
    writeSidebarDiscoveryDismissals(nextDismissals);
  };

  useEffect(() => {
    if (!initialPanel) return;
    setPanel(initialPanel);
    onInitialPanelConsumed?.();
  }, [initialPanel, onInitialPanelConsumed]);

  useEffect(() => {
    setActiveFieldPath(null);
    setActiveFieldSource(null);
    setFieldNavigationRequest(null);
  }, [item?.id]);

  useEffect(() => {
    if (fieldNavigationRequest?.target === "item") return;
    if (fieldNavigationRequest?.blockId === activeBlockId) return;
    setActiveFieldPath(null);
    setActiveFieldSource(null);
    setFieldNavigationRequest(null);
  }, [activeBlockId]);

  useEffect(() => {
    const scrollRegion = previewScrollRegionRef.current;
    if (!scrollRegion) return;

    const updateWidth = () => setPreviewViewportWidth(scrollRegion.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(scrollRegion);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!sectionsSheetOpen && !propertiesSheetOpen) return;

    const closeSheet = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSectionsSheetOpen(false);
      setPropertiesSheetOpen(false);
    };

    window.addEventListener("keydown", closeSheet);
    return () => window.removeEventListener("keydown", closeSheet);
  }, [propertiesSheetOpen, sectionsSheetOpen]);

  useEffect(() => {
    if (!previewFullscreen) return;
    const exitFullscreen = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewFullscreen(false);
    };
    window.addEventListener("keydown", exitFullscreen);
    return () => window.removeEventListener("keydown", exitFullscreen);
  }, [previewFullscreen]);

  const contentLocale = getContentLocale(item ?? undefined, graph.site);
  const headerNavigationItems = getNavigationItemsForLocation(graph, "header", contentLocale);
  const footerNavigationItems = getNavigationItemsForLocation(graph, "footer", contentLocale);
  const currentTemplateId = item
    ? "collectionId" in item
      ? resolveEntryTemplateId(item, definition)
      : resolvePageTemplateId(item)
    : null;
  const currentTemplate = currentTemplateId ? templatesById[currentTemplateId] : null;
  const blockingIssues = issues.filter((issue) => issue.level === "error").length;
  const blockingIssueList = issues.filter((issue) => issue.level === "error");
  const currentIssues = item ? issues.filter((issue) => issue.targetId === item.id) : [];
  const currentBlockingIssues = currentIssues.filter((issue) => issue.level === "error");
  const previewThemeStyle = createPreviewThemeStyle(graph.site);
  const previewWidths: Record<PreviewDevice, number> = {
    desktop: 1280,
    tablet: 768,
    mobile: 390,
  };
  const previewWidth = previewWidths[device];
  const previewScale =
    previewZoom === "fit" && previewViewportWidth > 0
      ? Math.min(1, Math.max(0.25, (previewViewportWidth - 32) / previewWidth))
      : 1;
  const remotePreviewRoute = item ? {
    graph,
    subject: item,
    routeType: "collectionId" in item ? "entry" as const : "page" as const,
    path: contentPath(item, graph, definition),
    page: 1,
    ...(definition ? { collection: definition } : {}),
  } : null;
  const handlePublishClick = () => {
    setPublishReviewOpen(true);
  };
  const issueTarget = (issue: ValidationIssue) => {
    const page = graph.pages.find((candidate) => candidate.id === issue.targetId);
    if (page) return { label: page.title, meta: `Page / ${contentPath(page, graph)}`, kind: "page" as const, id: page.id };

    const entry = graph.entries.find((candidate) => candidate.id === issue.targetId);
    if (entry) {
      const entryDefinition = graph.collectionDefinitions.find((candidate) => candidate.id === entry.collectionId);
      return {
        label: entry.title,
        meta: `${entryDefinition?.singularName ?? "Entry"} / ${contentPath(entry, graph, entryDefinition)}`,
        kind: "entry" as const,
        id: entry.id,
      };
    }

    const collection = graph.collectionDefinitions.find((candidate) => candidate.id === issue.targetId);
    if (collection) return { label: collection.name, meta: "Collection setup", tab: "content" as const };

    const category = graph.categories.find((candidate) => candidate.id === issue.targetId);
    if (category) return { label: category.name, meta: "Category setup", tab: "content" as const };

    return { label: "Site settings", meta: issue.scope, tab: "settings" as const };
  };
  const goToIssue = (issue: ValidationIssue) => {
    const target = issueTarget(issue);
    if ("kind" in target) {
      onSelectContent({ kind: target.kind, id: target.id });
      setPanel(issue.scope === "seo" ? "seo" : issue.scope === "assets" ? "content" : "technical");
      setPhoneMode("edit");
      setSectionsSheetOpen(false);
      setPropertiesSheetOpen(true);
    } else {
      onSetTab(target.tab);
    }
    setPublishReviewOpen(false);
  };
  const openCreateContent = () => setCreateContentOpen(true);
  const closeCreateContent = () => setCreateContentOpen(false);
  const openSharedBlockDialog = (block: BlockData) => {
    const blockLabel = blockLabels[block.type] ?? "Block";
    setSharedBlockDraft({
      blockId: block.id,
      blockLabel,
      name: `${blockLabel} shared block`,
    });
  };
  const closeSharedBlockDialog = () => setSharedBlockDraft(null);
  const handleSharedBlockSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sharedBlockDraft?.name.trim()) return;

    const sharedBlockId = onSaveBlockAsShared(sharedBlockDraft.blockId, sharedBlockDraft.name.trim());
    if (sharedBlockId) closeSharedBlockDialog();
  };
  const {
    patchTwoColumnContent,
    addNestedBlock,
    patchNestedBlock,
    removeNestedBlock,
    duplicateNestedBlock,
    moveNestedBlock,
  } = createTwoColumnBlockActions(onPatchBlock);

  const availableBlockDefinitions = getBlockDefinitionsForPacks(
    graph.site.enabledPacks,
    editorMode,
    graph.site.clientExtensions,
  );
  const componentLibraryGroups = availableBlockDefinitions
    .filter((definition) => definition.type !== BlockType.SHARED_BLOCK)
    .reduce<Array<{ category: string; definitions: typeof availableBlockDefinitions }>>((groups, definition) => {
      const category = definition.category || "General";
      const group = groups.find((candidate) => candidate.category === category);

      if (group) {
        group.definitions.push(definition);
      } else {
        groups.push({ category, definitions: [definition] });
      }

      return groups;
    }, []);
  const availableSectionCount =
    componentLibraryGroups.reduce((count, group) => count + group.definitions.length, 0) + graph.sharedBlocks.length;
  const getSectionInsertOptions = (): BlockInsertOptions | undefined => {
    if (selectedGlobalComponent === "header") return { atIndex: 0 };
    if (activeBlockId && item?.blocks.some((block) => block.id === activeBlockId)) return { afterBlockId: activeBlockId };
    return undefined;
  };
  const openSectionPicker = (options?: BlockInsertOptions) => {
    setSectionInsertOptions(options ?? getSectionInsertOptions());
    setSectionPickerOpen(true);
  };
  const closeSectionPicker = () => {
    setSectionPickerOpen(false);
    setSectionInsertOptions(undefined);
  };
  const pendingAfterBlock = sectionInsertOptions?.afterBlockId
    ? item?.blocks.find((block) => block.id === sectionInsertOptions.afterBlockId)
    : null;
  const sectionInsertLabel =
    sectionInsertOptions?.atIndex === 0
      ? "Insert at top"
      : pendingAfterBlock
        ? `Insert after ${blockLabels[pendingAfterBlock.type] ?? "section"}`
        : "Insert at end";
  const addSection = (type: BlockTypeId, initialContent?: Record<string, unknown>) => {
    const packId = getBlockPackId(type);
    if (packId && graph.site.enabledPacks && !graph.site.enabledPacks.includes(packId)) {
      onPatchGraph((draft) => {
        draft.site.enabledPacks = Array.from(new Set([...(draft.site.enabledPacks ?? []), packId]));
      });
    }
    setSelectedGlobalComponent(null);
    setLeftPanel("layers");
    onAddBlock(type, { ...sectionInsertOptions, initialContent });
    setPhoneMode("edit");
    setSectionsSheetOpen(false);
    setPropertiesSheetOpen(true);
  };

  const addSharedSection = (sharedBlockId: string) => {
    setSelectedGlobalComponent(null);
    setLeftPanel("layers");
    onAddSharedBlockReference(sharedBlockId, sectionInsertOptions);
    setPhoneMode("edit");
    setSectionsSheetOpen(false);
    setPropertiesSheetOpen(true);
  };

  const scrollPreviewTo = (kind: "block" | "global", targetId: string) => {
    window.requestAnimationFrame(() => {
      const attribute = kind === "block" ? "data-cms-preview-block" : "data-cms-preview-global";
      previewFrameRef.current?.scrollToElement(attribute, targetId);
    });
  };
  const revealProperties = () => {
    setPhoneMode("edit");
    setSectionsSheetOpen(false);
    setPropertiesSheetOpen(true);
  };
  const revealPreview = () => {
    setPhoneMode("preview");
    setSectionsSheetOpen(false);
    setPropertiesSheetOpen(false);
  };
  const revealSections = () => {
    setPhoneMode("sections");
    setLeftPanel("layers");
    setPropertiesSheetOpen(false);
    setSectionsSheetOpen(true);
  };

  const captureNavigationSnapshot = (): EditorNavigationSnapshot => ({
    selection,
    blockId: activeBlockId,
    globalComponent: selectedGlobalComponent,
    fieldPath: activeFieldPath,
    fieldSource: activeFieldSource,
    panel,
    device,
    zoom: previewZoom,
    frameScroll: previewFrameRef.current?.getScrollPosition() ?? { x: 0, y: 0 },
    canvasScroll: {
      left: previewScrollRegionRef.current?.scrollLeft ?? 0,
      top: previewScrollRegionRef.current?.scrollTop ?? 0,
    },
  });
  const navigationSnapshotKey = (snapshot: EditorNavigationSnapshot) => [
    snapshot.selection?.kind,
    snapshot.selection?.id,
    snapshot.blockId,
    snapshot.globalComponent,
    snapshot.fieldPath,
    snapshot.panel,
    snapshot.device,
    snapshot.zoom,
  ].join("|");
  const rememberNavigationContext = () => {
    const snapshot = captureNavigationSnapshot();
    const previous = backHistoryRef.current.at(-1);
    if (previous && navigationSnapshotKey(previous) === navigationSnapshotKey(snapshot)) return;

    backHistoryRef.current = [...backHistoryRef.current.slice(-39), snapshot];
    forwardHistoryRef.current = [];
    setHistoryRevision((current) => current + 1);
  };
  const restoreScrollPosition = (snapshot: EditorNavigationSnapshot) => {
    let attempts = 0;
    const restore = () => {
      const restored = previewFrameRef.current?.scrollToPosition(snapshot.frameScroll) ?? false;
      const scrollRegion = previewScrollRegionRef.current;
      if (scrollRegion) scrollRegion.scrollTo({ left: snapshot.canvasScroll.left, top: snapshot.canvasScroll.top, behavior: "auto" });
      if (!restored && attempts < 12) {
        attempts += 1;
        window.requestAnimationFrame(restore);
      }
    };
    window.requestAnimationFrame(restore);
  };
  const preserveCurrentPreviewPosition = () => {
    const framePosition = previewFrameRef.current?.getScrollPosition() ?? { x: 0, y: 0 };
    const canvasPosition = {
      left: previewScrollRegionRef.current?.scrollLeft ?? 0,
      top: previewScrollRegionRef.current?.scrollTop ?? 0,
    };
    let frameCount = 0;
    const restore = () => {
      previewFrameRef.current?.scrollToPosition(framePosition);
      previewScrollRegionRef.current?.scrollTo({
        left: canvasPosition.left,
        top: canvasPosition.top,
        behavior: "auto",
      });
      frameCount += 1;
      if (frameCount < 2) window.requestAnimationFrame(restore);
    };
    window.requestAnimationFrame(restore);
  };
  const applyNavigationSnapshot = (snapshot: EditorNavigationSnapshot) => {
    if (snapshot.selection && (
      snapshot.selection.kind !== selection?.kind || snapshot.selection.id !== selection?.id
    )) {
      pendingNavigationRestoreRef.current = snapshot;
      onSelectContent(snapshot.selection);
      return;
    }

    setSelectedGlobalComponent(snapshot.globalComponent);
    onSelectBlock(snapshot.blockId);
    setActiveFieldPath(snapshot.fieldPath);
    setActiveFieldSource(snapshot.fieldSource);
    setPanel(snapshot.panel);
    setDevice(snapshot.device);
    setPreviewZoom(snapshot.zoom);
    setPhoneMode(snapshot.fieldPath || snapshot.blockId || snapshot.globalComponent ? "edit" : "preview");
    if (snapshot.fieldPath) {
      fieldNavigationSequence.current += 1;
      setFieldNavigationRequest({
        target: snapshot.blockId ? "block" : "item",
        blockId: snapshot.blockId ?? undefined,
        path: snapshot.fieldPath,
        requestId: fieldNavigationSequence.current,
      });
    } else {
      setFieldNavigationRequest(null);
    }
    restoreScrollPosition(snapshot);
  };
  const navigateEditorHistory = (direction: "back" | "forward") => {
    const source = direction === "back" ? backHistoryRef : forwardHistoryRef;
    const destination = direction === "back" ? forwardHistoryRef : backHistoryRef;
    const snapshot = source.current.at(-1);
    if (!snapshot) return;

    source.current = source.current.slice(0, -1);
    destination.current = [...destination.current.slice(-39), captureNavigationSnapshot()];
    setHistoryRevision((current) => current + 1);
    applyNavigationSnapshot(snapshot);
  };

  useEffect(() => {
    const pendingSnapshot = pendingNavigationRestoreRef.current;
    if (!pendingSnapshot?.selection) return;
    if (pendingSnapshot.selection.kind !== selection?.kind || pendingSnapshot.selection.id !== selection.id) return;

    pendingNavigationRestoreRef.current = null;
    applyNavigationSnapshot(pendingSnapshot);
  }, [item?.id, selection?.id, selection?.kind]);

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f6f7f9] text-[#172033] lg:flex lg:flex-col">
      <EditorTopBar
        graph={graph}
        item={item}
        definition={definition}
        message={message}
        isBusy={isBusy}
        blockingIssues={blockingIssues}
        onSetTab={onSetTab}
        onSave={onSave}
        onOpenWebsiteSetup={onOpenWebsiteSetup}
        onPublishClick={handlePublishClick}
        onPublishPage={selection?.kind === "page" ? () => onPublishPage(selection.id) : undefined}
        onSelectContent={(nextSelection) => {
          rememberNavigationContext();
          onSelectContent(nextSelection);
        }}
        onCreateTranslation={onCreateTranslation}
      />

      <div
        className="cms-editor-layout relative grid h-[calc(100dvh-7.5rem)] min-h-0 sm:block sm:h-[calc(100dvh-56px)] lg:grid lg:h-auto lg:flex-1 lg:grid-cols-[48px_72px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[48px_72px_380px_minmax(0,1fr)]"
        onPointerDownCapture={(event) => {
          if (!desktopSidebarOpenRef.current) return;
          const target = event.target;
          if (target instanceof HTMLElement && target.closest("[data-cms-editor-sidebar]")) return;
          dismissDesktopSidebar();
        }}
      >
        <CmsRail activeTab="editor" onSetTab={onSetTab} />
        <EditorSidebar
          graph={graph}
          item={item}
          activeBlockId={activeBlockId}
          selectedGlobalComponent={selectedGlobalComponent}
          leftPanel={leftPanel}
          currentTemplate={currentTemplate ?? null}
          availableSectionCount={availableSectionCount}
          onSetLeftPanel={setLeftPanel}
          onSelectContent={(nextSelection) => {
            rememberNavigationContext();
            setSelectedGlobalComponent(null);
            onSelectContent(nextSelection);
            onSelectBlock(null);
            setPanel("content");
            revealPreview();
          }}
          onSelectBlock={(blockId) => {
            rememberNavigationContext();
            setSelectedGlobalComponent(null);
            onSelectBlock(blockId);
            setPanel("content");
            revealProperties();
            if (blockId) scrollPreviewTo("block", blockId);
          }}
          onSelectGlobalComponent={(id) => {
            rememberNavigationContext();
            setSelectedGlobalComponent(id);
            onSelectBlock(null);
            setPanel("content");
            revealProperties();
            scrollPreviewTo("global", id);
          }}
          onOpenCreateContent={openCreateContent}
          onOpenSectionPicker={() => openSectionPicker()}
          onEditTemplate={() => {
            setSelectedGlobalComponent(null);
            onSelectBlock(null);
            setPanel("technical");
            revealProperties();
          }}
          onRemoveBlock={onRemoveBlock}
          onReorderBlocks={onReorderBlocks}
          phoneVisible={phoneMode === "sections"}
          sheetOpen={sectionsSheetOpen}
          desktopOpen={desktopSidebarOpen}
          onClose={() => setSectionsSheetOpen(false)}
        />

        <main className={`${phoneMode === "preview" ? "flex" : "hidden"} lg:col-start-3 lg:row-start-1 xl:col-start-4 ${
          previewFullscreen ? "fixed inset-0 z-[70] h-[100dvh]" : "relative h-full lg:h-full"
        } min-h-0 min-w-0 flex-col bg-slate-100 transition-[opacity,transform] duration-200 sm:flex`}>
          <CanvasToolbar
            item={item}
            device={device}
            zoom={previewZoom}
            previewWidth={previewWidth}
            onSetDevice={(nextDevice) => {
              rememberNavigationContext();
              setDevice(nextDevice);
            }}
            onSetZoom={(nextZoom) => {
              rememberNavigationContext();
              setPreviewZoom(nextZoom);
            }}
            onOpenSections={() => {
              setPropertiesSheetOpen(false);
              setSectionsSheetOpen(true);
            }}
            onOpenProperties={() => {
              setSectionsSheetOpen(false);
              setPropertiesSheetOpen(true);
            }}
            sectionsOpen={sectionsSheetOpen}
            propertiesOpen={propertiesSheetOpen}
            fullscreen={previewFullscreen}
            onToggleFullscreen={() => setPreviewFullscreen((current) => !current)}
            canNavigateBack={backHistoryRef.current.length > 0}
            canNavigateForward={forwardHistoryRef.current.length > 0}
            onNavigateBack={() => navigateEditorHistory("back")}
            onNavigateForward={() => navigateEditorHistory("forward")}
            onOpenWebsiteSetup={onOpenWebsiteSetup}
            onViewLive={() => {
              if (item) window.open(contentPath(item, graph, definition), "_blank");
            }}
            onSave={onSave}
            onReview={handlePublishClick}
            onPublishPage={selection?.kind === "page" ? () => onPublishPage(selection.id) : undefined}
            isBusy={isBusy}
            blockingIssues={blockingIssues}
          />

          <div
            ref={previewScrollRegionRef}
            data-cms-preview-scroll-region
            className="h-full min-h-0 flex-1 overflow-auto bg-white"
          >

            {!item ? (
              <div className="mx-auto grid min-h-[420px] max-w-2xl place-items-center rounded-xl border border-dashed border-[#d9dee7] bg-white p-8 text-center shadow-[0_12px_30px_rgba(16,24,40,.08)]">
                <div>
                  <h2 className="text-lg font-bold tracking-[-0.03em] text-[#172033]">No content selected</h2>
                  <p className="mt-3 text-[13px] text-[#667085]">Create a page or choose an existing item from the left panel.</p>
                  <button onClick={openCreateContent} className="mt-6 rounded-lg bg-[#6c55ff] px-4 py-2.5 text-[13px] font-bold text-white">
                    Create Content
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex h-full min-h-[420px] justify-center"
                style={{ minWidth: `${previewWidth * previewScale}px` }}
              >
                {workspace.developmentMode === "code" && remotePreviewRoute ? (
                  <RemotePreviewFrame
                    ref={previewFrameRef}
                    workspace={workspace}
                    label={`${item.title} ${device} live client preview`}
                    route={remotePreviewRoute}
                    activeBlockId={activeBlockId}
                    width={previewWidth}
                    scale={previewScale}
                    onSelectBlock={(blockId) => {
                      preserveCurrentPreviewPosition();
                      rememberNavigationContext();
                      setActiveFieldPath(null);
                      setActiveFieldSource(null);
                      setFieldNavigationRequest(null);
                      setSelectedGlobalComponent(null);
                      onSelectBlock(blockId);
                      setLeftPanel("layers");
                      setPanel("content");
                      revealProperties();
                    }}
                  />
                ) : (
                  <PreviewFrame
                    ref={previewFrameRef}
                    label={`${item.title} ${device} preview`}
                    resetKey={item.id}
                    width={previewWidth}
                    scale={previewScale}
                    themeDesign={graph.site.design}
                    themeStyle={previewThemeStyle}
                    themeId={graph.site.design?.themeId}
                  >
                    <div className="min-h-full" onPointerDownCapture={dismissDesktopSidebar}>
                    <EditorNavigationSurface
                      graph={graph}
                      location="header"
                      items={headerNavigationItems}
                      active={selectedGlobalComponent === "header"}
                      onSelect={() => {
                        rememberNavigationContext();
                        setSelectedGlobalComponent("header");
                        onSelectBlock(null);
                        setLeftPanel("layers");
                        setPanel("content");
                        revealProperties();
                        scrollPreviewTo("global", "header");
                      }}
                    />
                    <TemplatePreview
                      item={item}
                      graph={graph}
                      definition={definition}
                      activeBlockId={!selectedGlobalComponent ? activeBlockId : null}
                      activeFieldPath={!selectedGlobalComponent ? activeFieldPath : null}
                      onSelectBlock={(blockId) => {
                        preserveCurrentPreviewPosition();
                        rememberNavigationContext();
                        setActiveFieldPath(null);
                        setActiveFieldSource(null);
                        setFieldNavigationRequest(null);
                        setSelectedGlobalComponent(null);
                        onSelectBlock(blockId);
                        setLeftPanel("layers");
                        setPanel("content");
                        revealProperties();
                      }}
                      onSelectField={(blockId, path, source, intent: PreviewFieldIntent = "select") => {
                        preserveCurrentPreviewPosition();
                        if (blockId !== activeBlockId || path !== activeFieldPath) rememberNavigationContext();
                        fieldNavigationSequence.current += 1;
                        setPanel("content");
                        setActiveFieldPath(path);
                        setActiveFieldSource(source ?? null);
                        setFieldNavigationRequest({
                          target: "block",
                          blockId,
                          path,
                          requestId: fieldNavigationSequence.current,
                        });
                        if (intent === "edit") revealProperties();
                      }}
                      onSelectItemField={(path, source, intent: PreviewFieldIntent = "select") => {
                        preserveCurrentPreviewPosition();
                        if (activeBlockId || path !== activeFieldPath) rememberNavigationContext();
                        fieldNavigationSequence.current += 1;
                        setSelectedGlobalComponent(null);
                        onSelectBlock(null);
                        setPanel(path.startsWith("seo.") ? "seo" : "technical");
                        setActiveFieldPath(path);
                        setActiveFieldSource(source ?? null);
                        setFieldNavigationRequest({
                          target: "item",
                          path,
                          requestId: fieldNavigationSequence.current,
                        });
                        if (intent === "edit") revealProperties();
                      }}
                      onMoveBlock={onMoveBlock}
                      onDuplicateBlock={onDuplicateBlock}
                      onRemoveBlock={onRemoveBlock}
                      onOpenSectionPicker={openSectionPicker}
                    />
                    <EditorNavigationSurface
                      graph={graph}
                      location="footer"
                      items={footerNavigationItems}
                      active={selectedGlobalComponent === "footer"}
                      onSelect={() => {
                        rememberNavigationContext();
                        setSelectedGlobalComponent("footer");
                        onSelectBlock(null);
                        setLeftPanel("layers");
                        setPanel("content");
                        revealProperties();
                        scrollPreviewTo("global", "footer");
                      }}
                    />
                    </div>
                  </PreviewFrame>
                )}
              </div>
            )}
          </div>
        </main>

        {sectionsSheetOpen && (
          <button
            type="button"
            aria-label="Close pages and sections"
            onClick={() => setSectionsSheetOpen(false)}
            className="fixed inset-0 top-14 z-40 hidden bg-slate-950/35 backdrop-blur-[1px] sm:block lg:hidden"
          />
        )}
        {propertiesSheetOpen && (
          <button
            type="button"
            aria-label="Close properties"
            onClick={() => setPropertiesSheetOpen(false)}
            className="cms-editor-properties-backdrop fixed inset-0 top-14 z-40 hidden bg-slate-950/35 backdrop-blur-[1px] sm:block"
          />
        )}

        <div
          className={`cms-editor-properties ${phoneMode === "edit" ? "block" : "hidden"} h-[calc(100dvh-7.5rem)] min-h-0 transition-transform duration-200 ease-out xl:col-start-3 xl:row-start-1 ${
            propertiesSheetOpen
              ? "sm:fixed sm:bottom-0 sm:right-0 sm:top-14 sm:z-50 sm:block sm:h-auto sm:w-[min(420px,calc(100vw-3rem))] sm:overflow-hidden sm:shadow-2xl"
              : "sm:hidden"
          }`}
        >
          <PropertiesPanel
            panel={panel}
            graph={graph}
            item={item}
            definition={definition}
            selectedBlock={selectedBlock ?? null}
            selectedGlobalComponent={selectedGlobalComponent}
            currentBlockingIssues={currentBlockingIssues}
            issues={issues}
            onSetPanel={(nextPanel) => {
              rememberNavigationContext();
              setPanel(nextPanel);
            }}
            onOpenAi={() => setAiOpen(true)}
            onChangeNavigation={onChangeNavigation}
            onPatchGraph={onPatchGraph}
            onPatch={onPatch}
            onPatchBlock={onPatchBlock}
            onUploadAsset={onUploadAsset}
            onManageSharedBlock={onManageSharedBlock}
            onDetachSharedBlockReference={onDetachSharedBlockReference}
            onMoveBlock={onMoveBlock}
            onDuplicateBlock={onDuplicateBlock}
            onRemoveBlock={onRemoveBlock}
            onDuplicateContent={onDuplicateContent}
            onDeleteContent={onDeleteContent}
            onOpenSharedBlockDialog={openSharedBlockDialog}
            patchTwoColumnContent={patchTwoColumnContent}
            addNestedBlock={addNestedBlock}
            patchNestedBlock={patchNestedBlock}
            removeNestedBlock={removeNestedBlock}
            duplicateNestedBlock={duplicateNestedBlock}
            moveNestedBlock={moveNestedBlock}
            onFocusField={(path) => {
              setActiveFieldPath(path);
              if (activeFieldSource?.navigationPath !== path) setActiveFieldSource(null);
            }}
            activeFieldPath={activeFieldPath}
            activeFieldSource={activeFieldSource}
            fieldNavigationRequest={fieldNavigationRequest}
            onClose={() => setPropertiesSheetOpen(false)}
            onBackToPage={() => {
              rememberNavigationContext();
              setSelectedGlobalComponent(null);
              onSelectBlock(null);
              setActiveFieldPath(null);
              setActiveFieldSource(null);
              setFieldNavigationRequest(null);
              setPanel("technical");
              revealPreview();
            }}
          />
        </div>
      </div>

      <nav
        role="tablist"
        aria-label="Mobile editor mode"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur sm:hidden"
      >
        {([
          ["preview", "Preview"],
          ["sections", "Sections"],
          ["edit", "Edit"],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={phoneMode === mode}
            aria-pressed={phoneMode === mode}
            onClick={() => {
              if (mode === "preview") revealPreview();
              if (mode === "sections") revealSections();
              if (mode === "edit") revealProperties();
            }}
            className={`mx-1 my-2 min-h-11 rounded-xl text-[12px] font-extrabold transition ${
              phoneMode === mode
                ? "bg-[#f1ecff] text-[#6247ff]"
                : "text-[#667085] hover:bg-[#f8fafc] hover:text-[#172033]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <AiAssistantModal open={aiOpen} onClose={() => setAiOpen(false)} />
      <PublishReviewModal
        open={publishReviewOpen}
        issues={blockingIssueList}
        getTarget={issueTarget}
        onFix={goToIssue}
        onClose={() => setPublishReviewOpen(false)}
        onPublish={() => {
          setPublishReviewOpen(false);
          onPublish();
        }}
      />
      <SharedBlockDialog
        draft={sharedBlockDraft}
        onChangeDraft={setSharedBlockDraft}
        onSubmit={handleSharedBlockSubmit}
        onClose={closeSharedBlockDialog}
      />
      <SectionPicker
        open={sectionPickerOpen}
        groups={componentLibraryGroups}
        sharedBlocks={graph.sharedBlocks}
        graph={graph}
        subject={item}
        insertLabel={sectionInsertLabel}
        onAddSection={addSection}
        onAddSharedSection={addSharedSection}
        onClose={closeSectionPicker}
      />
      <CreateContentModal
        open={createContentOpen}
        graph={graph}
        onCreatePage={onCreatePage}
        onCreateEntry={onCreateEntry}
        onClose={closeCreateContent}
        onCreated={() => {
          setPanel("seo");
          revealProperties();
        }}
      />
      <ContentBrowserModal
        open={contentBrowserOpen}
        graph={graph}
        currentItem={item}
        onSelect={(nextSelection) => {
          setSelectedGlobalComponent(null);
          onSelectContent(nextSelection);
        }}
        onClose={() => setContentBrowserOpen(false)}
      />

    </div>
  );
}
