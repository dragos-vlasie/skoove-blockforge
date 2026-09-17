import { useEffect, useState } from "react";
import { COLLECTION_PRESETS } from "./constants";
import { blockDefinitions } from "./src/blocks/registry";
import {
  CategoryDirectory,
  CollectionDirectory,
  JsonPanel,
  MediaLibraryPanel,
  PageDirectory,
  RedirectEditor,
  SharedBlockDirectory,
} from "./src/cms/adminPanels";
import { tabs } from "./src/cms/constants";
import { CmsNavigation, CmsTopBar } from "./src/cms/CmsChrome";
import { now } from "./src/cms/contentUtils";
import { SvgIcon } from "./src/cms/icons";
import { AnalyticsPanel } from "./src/cms/analytics/AnalyticsPanel";
import { CmsDialog } from "./src/cms/primitives/CmsDialog";
import { Field, selectChromeClass, TextArea, TextInput } from "./src/cms/ui";
import { useCmsController } from "./src/cms/useCmsController";
import { VisualPageEditor } from "./src/cms/VisualPageEditor";
import { ContentBrowserModal } from "./src/cms/editor/ContentBrowserModal";
import { CreateContentModal } from "./src/cms/editor/CreateContentModal";
import { NavigationWorkspace } from "./src/cms/navigation/NavigationWorkspace";
import { PatternAssessmentPanel } from "./src/cms/patterns/PatternAssessmentPanel";
import {
  getEnabledCollectionPresets,
  packManifests,
} from "./src/packs/registry";
import { createCustomBlueprint } from "./src/blueprints/registry";
import type { SubjectPatternAssessment } from "./src/patterns/assessment";
import type { PropertiesPanelTab } from "./src/cms/editor/PropertiesPanel";
import type { ViewAnalyticsSummary } from "./src/lib/cms/viewAnalytics";
import { applyStarterToGraph, starterDefinitions } from "./src/starters/registry";
import {
  createDesignFromThemePreset,
  fontSelectOptions,
  getThemePreset,
  themePresetOptions,
} from "./src/themes/registry";
import type { ContentBlueprintDefinition, ContentGraph, NavigationItem } from "./types";
import {
  cmsApiUrl,
  cmsWorkspaceHref,
  type CmsWorkspace,
} from "./src/lib/cms/workspaceTypes";

type WebsiteSetupDraft = {
  starterId: string;
  themeId: string;
  siteName: string;
  siteUrl: string;
  logo: string;
  favicon: string;
  defaultOgImage: string;
  defaultDescription: string;
  organizationName: string;
  defaultLocale: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  radius: "sm" | "md" | "lg";
};

const fallbackDesign = createDesignFromThemePreset("clean-saas");

const starterThemeDefaults: Record<string, string> = {
  blank: "clean-saas",
  blog: "journal-classic",
  "launch-saas": "launch-saas",
  "studio-agency": "studio-agency",
  "journal-blog": "journal-classic",
  agency: "studio-agency",
  portfolio: "portfolio-vivid",
  "local-business": "local-trust",
};

const createWebsiteSetupDraft = (graph: ContentGraph): WebsiteSetupDraft => {
  const design = { ...fallbackDesign, ...graph.site.design };

  return {
    starterId: graph.site.starterId || starterDefinitions[0]?.id || "blank",
    themeId: design.themeId || starterThemeDefaults[graph.site.starterId || ""] || fallbackDesign.themeId,
    siteName: graph.site.siteName || "New Website",
    siteUrl: graph.site.siteUrl || "https://example.com",
    logo: graph.site.logo || graph.site.organization.logo || "",
    favicon: graph.site.favicon || "",
    defaultOgImage: graph.site.defaultOgImage || "",
    defaultDescription: graph.site.defaultDescription || "",
    organizationName: graph.site.organization.name || graph.site.siteName || "",
    defaultLocale: graph.site.defaultLocale || "en",
    primaryColor: design.primaryColor,
    accentColor: design.accentColor,
    backgroundColor: design.backgroundColor,
    textColor: design.textColor,
    headingFont: design.headingFont,
    bodyFont: design.bodyFont,
    radius: design.radius,
  };
};


const normalizeSiteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed.replace(/\/+$/g, "") : `https://${trimmed.replace(/\/+$/g, "")}`;
};

export default function App({
  workspace,
  workspaces,
}: {
  workspace: CmsWorkspace;
  workspaces: CmsWorkspace[];
}) {
  const [websiteSetupOpen, setWebsiteSetupOpen] = useState(false);
  const [contentView, setContentView] = useState<string>("pages");
  const [settingsView, setSettingsView] = useState<"general" | "brand" | "seo" | "components" | "models" | "patterns" | "urls" | "publishing">("general");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [focusedSharedBlockRequest, setFocusedSharedBlockRequest] = useState<{
    id: string;
    path?: string;
    requestId: number;
  } | null>(null);
  const [initialEditorPanel, setInitialEditorPanel] = useState<PropertiesPanelTab | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<ViewAnalyticsSummary | null>(null);
  const [analyticsStatus, setAnalyticsStatus] = useState("Analytics will load when opened.");
  const [analyticsRangeDays, setAnalyticsRangeDays] = useState(30);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [createContentRequest, setCreateContentRequest] = useState<{ type: string } | null>(null);
  const {
    graph,
    issues,
    activeTab,
    setActiveTab,
    selection,
    setSelection,
    activeBlockId,
    setActiveBlockId,
    selectedItem,
    selectedDefinition,
    selectedBlock,
    message,
    isBusy,
    isDirty,
    lastSavedAt,
    loadError,
    retryLoad,
    setNavigationDraft,
    redirectsDraft,
    setRedirectsDraft,
    redirectsError,
    patchGraph,
    patchSelected,
    patchSelectedBlock,
    removeSelectedBlock,
    duplicateSelectedBlock,
    moveSelectedBlock,
    reorderSelectedBlocks,
    duplicateSelectedContent,
    deleteSelectedContent,
    saveDraft,
    publishSnapshot,
    uploadAsset,
    replaceAsset,
    patchAsset,
    deleteAsset,
    addBlock,
    addSharedBlockReference,
    createSharedBlockRecord,
    saveSelectedBlockAsShared,
    detachSharedBlockReference,
    createNewPage,
    createNewEntry,
    createTranslation,
    addPresetCollection,
    addCategory,
    applyRedirectsJson,
  } = useCmsController(workspace);
  const refreshAnalytics = async () => {
    setAnalyticsStatus("Loading traffic…");
    try {
      const response = await fetch(cmsApiUrl("/api/cms/views", workspace, { range: analyticsRangeDays }), { headers: { accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load analytics.");
      setAnalyticsSummary(data);
      setAnalyticsStatus("Updated just now.");
    } catch (error) {
      setAnalyticsStatus(error instanceof Error ? error.message : "Unable to load analytics.");
    }
  };

  useEffect(() => {
    if (activeTab === "analytics" && !analyticsSummary) refreshAnalytics();
  }, [activeTab, analyticsSummary, analyticsRangeDays]);

  useEffect(() => {
    const compactNavigation = window.matchMedia("(max-width: 1439px)");
    const syncNavigation = () => setNavigationCollapsed(compactNavigation.matches);
    syncNavigation();
    compactNavigation.addEventListener("change", syncNavigation);
    return () => compactNavigation.removeEventListener("change", syncNavigation);
  }, []);

  useEffect(() => {
    if (activeTab === "editor") return;
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, [activeTab]);

  const isBuilderMode = ["platform_admin", "owner", "manager", "developer", "admin"].includes(workspace.role);

  useEffect(() => {
    if (!isBuilderMode && settingsView === "patterns") {
      setSettingsView("components");
    }
  }, [isBuilderMode, settingsView]);

  if (!graph) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#f6f7fb] px-5 text-[#172033]">
        <div className="w-full max-w-md rounded-2xl border border-[#e4e7ec] bg-white p-7 text-center shadow-lg shadow-slate-900/5">
          <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${loadError ? "bg-rose-50 text-rose-600" : "bg-violet-50 text-violet-600"}`}>
            {loadError ? "!" : <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-[-0.03em]">
            {loadError ? "We couldn’t load your CMS" : "Loading your workspace"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#667085]" role={loadError ? "alert" : "status"} aria-live="polite">
            {loadError || "Pages, media, and settings will be ready shortly."}
          </p>
          {loadError && (
            <button
              type="button"
              onClick={() => retryLoad().catch(() => undefined)}
              disabled={isBusy}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[#6d5dfc] px-5 text-sm font-bold text-white transition hover:bg-[#5947e8] disabled:opacity-50"
            >
              {isBusy ? "Retrying…" : "Try again"}
            </button>
          )}
        </div>
      </main>
    );
  }

  const errorCount = issues.filter((issue) => issue.level === "error").length;
  const saveStatus = isDirty
    ? "Unsaved changes"
    : message || (lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "All changes saved");
  const openWebsiteSetup = () => setWebsiteSetupOpen(true);
  const applyWebsiteSetup = (input: WebsiteSetupDraft) => {
    patchGraph((draft) => {
      applyStarterToGraph(draft, input.starterId);

      const siteName = input.siteName.trim() || draft.site.siteName || "New Website";
      const siteUrl = normalizeSiteUrl(input.siteUrl) || draft.site.siteUrl;
      const logo = input.logo.trim();
      const favicon = input.favicon.trim();
      const defaultOgImage = input.defaultOgImage.trim();
      const organizationName = input.organizationName.trim() || siteName;

      draft.site.siteName = siteName;
      draft.site.siteUrl = siteUrl;
      draft.site.starterId = input.starterId;
      draft.site.logo = logo;
      draft.site.favicon = favicon;
      draft.site.defaultOgImage = defaultOgImage;
      draft.site.defaultDescription = input.defaultDescription.trim();
      draft.site.defaultLocale = input.defaultLocale.trim() || "en";
      draft.site.defaultTitlePattern = `%s | ${siteName}`;
      draft.site.organization.name = organizationName;
      draft.site.organization.logo = logo;
      draft.site.design = createDesignFromThemePreset(input.themeId, {
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
        backgroundColor: input.backgroundColor,
        textColor: input.textColor,
        headingFont: input.headingFont.trim() || "Inter",
        bodyFont: input.bodyFont.trim() || "Inter",
        radius: input.radius,
      });
    });
    setSelection({ kind: "page", id: "page-home" });
    setActiveBlockId(null);
    setContentView("pages");
    setActiveTab("editor");
    setWebsiteSetupOpen(false);
  };
  const pruneNavigationItems = (
    items: NavigationItem[],
    shouldRemove: (item: NavigationItem) => boolean,
  ): NavigationItem[] =>
    items
      .filter((item) => !shouldRemove(item))
      .map((item) => item.children ? { ...item, children: pruneNavigationItems(item.children, shouldRemove) } : item);
  const deleteCollectionDefinition = (definitionId: string) => {
    const removesSelectedEntry =
      selection?.kind === "entry" &&
      graph.entries.some((entry) => entry.id === selection.id && entry.collectionId === definitionId);

    patchGraph((draft) => {
      const deletedEntryIds = new Set(
        draft.entries
          .filter((entry) => entry.collectionId === definitionId)
          .map((entry) => entry.id),
      );

      draft.collectionDefinitions = draft.collectionDefinitions.filter((definition) => definition.id !== definitionId);
      draft.entries = draft.entries.filter((entry) => entry.collectionId !== definitionId);
      draft.categories.forEach((category) => {
        category.collectionIds = category.collectionIds.filter((collectionId) => collectionId !== definitionId);
      });
      draft.navigation.forEach((menu) => {
        menu.items = pruneNavigationItems(
          menu.items,
          (item) =>
            (item.targetType === "collection" && item.targetId === definitionId) ||
            (item.targetType === "entry" && Boolean(item.targetId && deletedEntryIds.has(item.targetId))),
        );
      });
    });

    if (removesSelectedEntry) {
      const fallbackPage = graph.pages[0];
      setSelection(fallbackPage ? { kind: "page", id: fallbackPage.id } : null);
    }
  };
  const deleteCategory = (categoryId: string) => {
    patchGraph((draft) => {
      draft.categories = draft.categories.filter((category) => category.id !== categoryId);
      draft.entries.forEach((entry) => {
        entry.categoryIds = entry.categoryIds.filter((id) => id !== categoryId);
      });
      draft.collectionDefinitions.forEach((definition) => {
        definition.categoryIds = definition.categoryIds.filter((id) => id !== categoryId);
      });
      draft.navigation.forEach((menu) => {
        menu.items = pruneNavigationItems(
          menu.items,
          (item) => item.targetType === "category" && item.targetId === categoryId,
        );
      });
    });
  };

  if (activeTab === "editor") {
    return (
      <>
        <VisualPageEditor
          workspace={workspace}
          graph={graph}
          issues={issues}
          selection={selection}
          item={selectedItem}
          definition={selectedDefinition}
          selectedBlock={selectedBlock}
          activeBlockId={activeBlockId}
          message={message}
          isBusy={isBusy}
          errorCount={errorCount}
          onSetTab={setActiveTab}
          onSelectContent={setSelection}
          onSelectBlock={setActiveBlockId}
          onCreatePage={createNewPage}
          onCreateEntry={createNewEntry}
          onCreateTranslation={createTranslation}
          onSave={saveDraft}
          onPublish={publishSnapshot}
          onPublishPage={(pageId) => publishSnapshot({ scope: "page", pageId })}
          onPatchGraph={patchGraph}
          onPatch={patchSelected}
          onPatchBlock={patchSelectedBlock}
          onAddBlock={addBlock}
          onAddSharedBlockReference={addSharedBlockReference}
          onUploadAsset={uploadAsset}
          onSaveBlockAsShared={saveSelectedBlockAsShared}
          onDetachSharedBlockReference={detachSharedBlockReference}
          onManageSharedBlock={(sharedBlockId, fieldPath) => {
            setFocusedSharedBlockRequest((current) => ({
              id: sharedBlockId,
              path: fieldPath,
              requestId: (current?.requestId ?? 0) + 1,
            }));
            setContentView("shared");
            setActiveTab("content");
          }}
          onRemoveBlock={removeSelectedBlock}
          onDuplicateBlock={duplicateSelectedBlock}
          onMoveBlock={moveSelectedBlock}
          onReorderBlocks={reorderSelectedBlocks}
          onDuplicateContent={duplicateSelectedContent}
          onDeleteContent={deleteSelectedContent}
          onChangeNavigation={(navigation) => {
            patchGraph((draft) => { draft.navigation = navigation; });
            setNavigationDraft(JSON.stringify(navigation, null, 2));
          }}
          onOpenWebsiteSetup={openWebsiteSetup}
          editorMode={isBuilderMode ? "builder" : "client"}
          initialPanel={initialEditorPanel}
          onInitialPanelConsumed={() => setInitialEditorPanel(null)}
        />
        {websiteSetupOpen && (
          <WebsiteSetupModal
            graph={graph}
            onClose={() => setWebsiteSetupOpen(false)}
            onApply={applyWebsiteSetup}
          />
        )}
      </>
    );
  }


  const contentTabs = [
    { id: "pages", label: "Pages", count: graph.pages.length },
    { id: "navigation", label: "Navigation", count: graph.navigation.length },
    { id: "shared", label: "Reusable sections", count: graph.sharedBlocks.length },
    ...graph.collectionDefinitions.map((definition) => ({
      id: `model:${definition.id}`,
      label: definition.name,
      count: graph.entries.filter((entry) => entry.collectionId === definition.id).length,
    })),
  ];
  const activeModelId = contentView.startsWith("model:") ? contentView.slice("model:".length) : null;
  const activeModel = activeModelId
    ? graph.collectionDefinitions.find((definition) => definition.id === activeModelId) ?? null
    : null;
  const collectionPresets = [
    ...COLLECTION_PRESETS,
    ...getEnabledCollectionPresets(graph.site.enabledPacks),
  ].filter(
    (preset, index, presets) =>
      presets.findIndex((candidate) => candidate.id === preset.id) === index,
  );

  const openContentInEditor = (nextSelection: typeof selection) => {
    if (!nextSelection) return;
    const nextItem =
      nextSelection.kind === "page"
        ? graph.pages.find((page) => page.id === nextSelection.id)
        : graph.entries.find((entry) => entry.id === nextSelection.id);
    setInitialEditorPanel(null);
    setSelection(nextSelection);
    setActiveBlockId(nextItem?.blocks[0]?.id ?? null);
    setActiveTab("editor");
  };
  const upsertBlueprintAssignment = (
    subject: SubjectPatternAssessment,
    input: {
      status: "assigned" | "custom";
      patternId?: string;
      blueprintId?: string;
    },
  ) => {
    patchGraph((draft) => {
      draft.blueprintAssignments ??= [];
      const assignmentId = `blueprint-assignment-${subject.subjectKind}-${subject.subjectId}`;
      const existing = draft.blueprintAssignments.find(
        (assignment) => assignment.id === assignmentId,
      );
      const next = {
        id: assignmentId,
        subjectKind: subject.subjectKind,
        subjectId: subject.subjectId,
        status: input.status,
        patternId: input.patternId,
        blueprintId: input.blueprintId,
        updatedAt: now(),
      };
      if (existing) Object.assign(existing, next);
      else draft.blueprintAssignments.push(next);
    });
  };
  const assignBlueprint = (
    subject: SubjectPatternAssessment,
    blueprint: ContentBlueprintDefinition,
  ) =>
    upsertBlueprintAssignment(subject, {
      status: "assigned",
      patternId: subject.patternId ?? blueprint.patternId,
      blueprintId: blueprint.id,
    });
  const keepPatternCustom = (subject: SubjectPatternAssessment) =>
    upsertBlueprintAssignment(subject, {
      status: "custom",
      patternId: subject.patternId ?? undefined,
    });
  const createBlueprintFromSubject = (subject: SubjectPatternAssessment) => {
    const source =
      subject.subjectKind === "page"
        ? graph.pages.find((page) => page.id === subject.subjectId)
        : graph.entries.find((entry) => entry.id === subject.subjectId);
    if (!source) return;

    const blueprint = createCustomBlueprint(source, {
      name: `${subject.patternName} layout`,
      description: `Reusable layout captured from ${subject.title}.`,
      outcome: subject.evidence.map((item) => item.label).join(", ") || "A site-specific reusable layout.",
      category: subject.patternCategory,
      patternId: subject.patternId ?? undefined,
    });

    patchGraph((draft) => {
      draft.customBlueprints ??= [];
      draft.blueprintAssignments ??= [];
      draft.customBlueprints.push(blueprint);
      const assignmentId = `blueprint-assignment-${subject.subjectKind}-${subject.subjectId}`;
      const existing = draft.blueprintAssignments.find(
        (assignment) => assignment.id === assignmentId,
      );
      const next = {
        id: assignmentId,
        subjectKind: subject.subjectKind,
        subjectId: subject.subjectId,
        status: "assigned" as const,
        patternId: subject.patternId ?? undefined,
        blueprintId: blueprint.id,
        updatedAt: now(),
      };
      if (existing) Object.assign(existing, next);
      else draft.blueprintAssignments.push(next);
    });
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#172033] lg:h-screen lg:overflow-hidden">
      <CmsTopBar
        siteName={graph.site.siteName || "BlockForge"}
        siteUrl={graph.site.siteUrl}
        message={saveStatus}
        onOpenWebsiteSetup={openWebsiteSetup}
        onSearch={() => setGlobalSearchOpen(true)}
        actions={[
          { label: "Clients", onClick: () => { window.location.href = "/cms"; } },
          { label: "View site", onClick: () => window.open(graph.site.siteUrl || "/", "_blank"), icon: "desktop" },
        ]}
        trailing={
          <select
            aria-label="Switch client"
            value={`${workspace.tenantId}:${workspace.siteId}`}
            onChange={(event) => {
              const nextWorkspace = workspaces.find(
                (candidate) => `${candidate.tenantId}:${candidate.siteId}` === event.target.value,
              );
              if (nextWorkspace) window.location.href = cmsWorkspaceHref(nextWorkspace);
            }}
            className="h-9 max-w-40 rounded-lg border border-[#d9dee7] bg-white px-2 text-xs font-semibold text-[#344054] outline-none transition hover:border-[#c7b8ff] focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20"
          >
            {workspaces.map((candidate) => (
              <option key={`${candidate.tenantId}:${candidate.siteId}`} value={`${candidate.tenantId}:${candidate.siteId}`}>
                {candidate.tenantName}
              </option>
            ))}
          </select>
        }
      />
      <p className="sr-only" role="status" aria-live="polite">{saveStatus}</p>
      <div className="grid min-h-[calc(100dvh-56px)] lg:h-[calc(100dvh-56px)] lg:grid-cols-[auto_minmax(0,1fr)] lg:overflow-hidden">
        <CmsNavigation
          activeTab={activeTab}
          onSetTab={setActiveTab}
          collapsed={navigationCollapsed}
          onToggleCollapsed={() => setNavigationCollapsed((collapsed) => !collapsed)}
          className="hidden lg:flex"
        />

        <main className="min-w-0 overflow-auto bg-[#f8fafc] pb-24 lg:h-full lg:pb-0">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
          {activeTab === "content" && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-[#e4e7ec]">
                <div className="flex min-w-0 items-baseline gap-3 pb-2">
                  <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#101828]">Content</h1>
                  <p className="hidden truncate text-xs text-[#667085] md:block">Pages and structured content</p>
                </div>
                <div className="flex max-w-full gap-5 overflow-x-auto" role="tablist" aria-label="Content types">
                  {contentTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={contentView === tab.id}
                      onClick={() => setContentView(tab.id)}
                      className={`flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-0.5 text-sm font-medium transition ${
                        contentView === tab.id
                          ? "border-[#6d5dfc] text-[#4f3fe0]"
                          : "border-transparent text-[#667085] hover:text-[#172033]"
                      }`}
                    >
                      {tab.label}
                      <span className="rounded-full bg-[#eef1f5] px-1.5 py-0.5 text-[11px] text-[#667085]">{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {contentView === "pages" ? (
                <PageDirectory
                  graph={graph}
                  scope="pages"
                  actionLabel="Create content"
                  onCreate={() => {
                    setCreateContentRequest({ type: "page" });
                  }}
                  onEdit={openContentInEditor}
                />
              ) : contentView === "navigation" ? (
                <NavigationWorkspace
                  graph={graph}
                  onChange={(navigation) => {
                    patchGraph((draft) => { draft.navigation = navigation; });
                    setNavigationDraft(JSON.stringify(navigation, null, 2));
                  }}
                />
              ) : contentView === "shared" ? (
                <SharedBlockDirectory
                  graph={graph}
                  focusedRequest={focusedSharedBlockRequest}
                  backToEditorLabel={selectedItem?.title}
                  onBackToEditor={focusedSharedBlockRequest ? () => {
                    setFocusedSharedBlockRequest(null);
                    setActiveTab("editor");
                  } : undefined}
                  onAdd={createSharedBlockRecord}
                  onPatch={(sharedBlockId, updater) =>
                    patchGraph((draft) => {
                      const item = draft.sharedBlocks.find((candidate) => candidate.id === sharedBlockId);
                      if (!item) return;
                      updater(item);
                      item.updatedAt = now();
                    })
                  }
                  onDelete={(sharedBlockId) =>
                    patchGraph((draft) => {
                      draft.sharedBlocks = draft.sharedBlocks.filter((sharedBlock) => sharedBlock.id !== sharedBlockId);
                    })
                  }
                  onUploadAsset={uploadAsset}
                />
              ) : activeModel ? (
                <PageDirectory
                  graph={graph}
                  title={activeModel.name}
                  description={`Manage every ${activeModel.singularName.toLowerCase()} from one place.`}
                  actionLabel="Create content"
                  scope={{ collectionId: activeModel.id }}
                  onCreate={() => setCreateContentRequest({ type: activeModel.id })}
                  onEdit={openContentInEditor}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-[#d9dee7] bg-white p-10 text-center text-sm text-[#667085]">
                  Choose a content type.
                </div>
              )}
            </section>
          )}

          {activeTab === "media" && (
            <MediaLibraryPanel
              graph={graph}
              checkUrl={cmsApiUrl("/api/cms/media/check", workspace)}
              onUpload={uploadAsset}
              onReplace={replaceAsset}
              onPatch={patchAsset}
              onDelete={deleteAsset}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsPanel
              summary={analyticsSummary}
              status={analyticsStatus}
              rangeDays={analyticsRangeDays}
              onRangeChange={(days) => {
                setAnalyticsRangeDays(days);
                setAnalyticsSummary(null);
              }}
              onRefresh={refreshAnalytics}
            />
          )}

          {activeTab === "settings" && (
            <section>
              <div className="mb-7">
                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#101828]">Settings</h1>
                <p className="mt-1 text-sm text-[#667085]">Configure this workspace and how the public website is published.</p>
              </div>
              <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,760px)]">
                <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:block lg:space-y-1">
                  {([
                    ["general", "General"],
                    ["brand", "Brand and design"],
                    ["seo", "SEO defaults"],
                    ["components", "Component packs"],
                    ["models", "Content models"],
                    ...(isBuilderMode ? [["patterns", "Pattern assessment"] as const] : []),
                    ["urls", "URLs and redirects"],
                    ["publishing", "Publishing and integrations"],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSettingsView(id)}
                      aria-current={settingsView === id ? "page" : undefined}
                      className={`h-10 shrink-0 rounded-lg px-3 text-left text-sm font-medium transition lg:block lg:w-full ${
                        settingsView === id
                          ? "bg-[#ece9ff] text-[#4f3fe0]"
                          : "text-[#667085] hover:bg-white hover:text-[#172033]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                <div className="min-w-0">
                  {settingsView === "general" && (
                    <GeneralSettingsPanel graph={graph} onPatch={patchGraph} onOpenSetup={openWebsiteSetup} />
                  )}
                  {settingsView === "brand" && (
                    <SiteDesignPanel graph={graph} onPatch={(updater) => patchGraph((draft) => updater(draft))} />
                  )}
                  {settingsView === "seo" && <SeoSettingsPanel graph={graph} onPatch={patchGraph} />}
                  {settingsView === "components" && <ComponentPacksSettingsPanel graph={graph} onPatch={patchGraph} isBuilderMode={isBuilderMode} />}
                  {settingsView === "models" && (
                    <div className="space-y-6">
                      <CollectionDirectory
                        graph={graph}
                        presets={collectionPresets}
                        onAddPreset={addPresetCollection}
                        onPatch={(definitionId, updates) =>
                          patchGraph((draft) => {
                            const item = draft.collectionDefinitions.find((candidate) => candidate.id === definitionId);
                            if (item) Object.assign(item, updates, { updatedAt: now() });
                          })
                        }
                        onDelete={deleteCollectionDefinition}
                      />
                      <CategoryDirectory
                        graph={graph}
                        onAdd={addCategory}
                        onPatch={(categoryId, updates) =>
                          patchGraph((draft) => {
                            const item = draft.categories.find((candidate) => candidate.id === categoryId);
                            if (item) Object.assign(item, updates, { updatedAt: now() });
                          })
                        }
                        onDelete={deleteCategory}
                      />
                    </div>
                  )}
                  {settingsView === "patterns" && isBuilderMode && (
                    <PatternAssessmentPanel
                      graph={graph}
                      onAssignBlueprint={assignBlueprint}
                      onKeepCustom={keepPatternCustom}
                      onCreateBlueprint={createBlueprintFromSubject}
                      onOpenContent={(subject) =>
                        openContentInEditor({
                          kind: subject.subjectKind,
                          id: subject.subjectId,
                        })
                      }
                    />
                  )}
                  {settingsView === "urls" && (
                    <div className="space-y-6">
                      <RedirectEditor
                        redirects={graph.redirects}
                        onChange={(redirects) => {
                          patchGraph((draft) => { draft.redirects = redirects; });
                          setRedirectsDraft(JSON.stringify(redirects, null, 2));
                        }}
                      />
                      <details className="rounded-xl border border-[#e4e7ec] bg-white p-5">
                        <summary className="cursor-pointer text-sm font-medium text-[#475467]">Advanced redirects JSON</summary>
                        <JsonPanel
                          title="Redirect JSON"
                          description="Escape hatch for bulk redirect edits."
                          value={redirectsDraft}
                          error={redirectsError}
                          onChange={setRedirectsDraft}
                          onApply={applyRedirectsJson}
                        />
                      </details>
                    </div>
                  )}
                  {settingsView === "publishing" && <PublishingSettingsPanel />}
                </div>
              </div>
            </section>
          )}
          </div>
        </main>
      </div>
      <nav aria-label="Mobile CMS navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#e4e7ec] bg-white/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(16,24,40,.08)] backdrop-blur lg:hidden">
        {tabs.map((item) => {
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setActiveTab(item.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold ${active ? "text-[#6d5dfc]" : "text-[#667085]"}`}
            >
              <SvgIcon
                name={(
                  item.id === "editor"
                    ? "editor"
                    : item.id === "content"
                      ? "content"
                    : item.id === "media"
                      ? "image"
                      : item.id === "analytics"
                        ? "chart"
                        : "settings"
                ) as Parameters<typeof SvgIcon>[0]["name"]}
                className="h-5 w-5"
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <ContentBrowserModal
        open={globalSearchOpen}
        graph={graph}
        currentItem={selectedItem}
        onSelect={openContentInEditor}
        onClose={() => setGlobalSearchOpen(false)}
      />
      <CreateContentModal
        open={Boolean(createContentRequest)}
        graph={graph}
        initialType={createContentRequest?.type}
        onCreatePage={createNewPage}
        onCreateEntry={createNewEntry}
        onClose={() => setCreateContentRequest(null)}
        onCreated={() => {
          setCreateContentRequest(null);
          setInitialEditorPanel("content");
        }}
      />
      {websiteSetupOpen && (
        <WebsiteSetupModal
          graph={graph}
          onClose={() => setWebsiteSetupOpen(false)}
          onApply={applyWebsiteSetup}
        />
      )}
    </div>
  );
}

function SettingsPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#e4e7ec] bg-white">
      <div className="border-b border-[#e4e7ec] px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#101828]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#667085]">{description}</p>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function GeneralSettingsPanel({
  graph,
  onPatch,
  onOpenSetup,
}: {
  graph: ContentGraph;
  onPatch: (updater: (draft: ContentGraph) => void) => void;
  onOpenSetup: () => void;
}) {
  return (
    <SettingsPanel title="General" description="The public identity and primary address for this website.">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Site name">
          <TextInput value={graph.site.siteName} onChange={(event) => onPatch((draft) => { draft.site.siteName = event.target.value; })} />
        </Field>
        <Field label="Production URL">
          <TextInput value={graph.site.siteUrl} onChange={(event) => onPatch((draft) => { draft.site.siteUrl = event.target.value; })} />
        </Field>
        <Field label="Default locale">
          <TextInput value={graph.site.defaultLocale} onChange={(event) => onPatch((draft) => { draft.site.defaultLocale = event.target.value; })} />
        </Field>
        <Field label="Organization name">
          <TextInput value={graph.site.organization.name} onChange={(event) => onPatch((draft) => { draft.site.organization.name = event.target.value; })} />
        </Field>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e7ec] pt-5">
        <p className="text-sm text-[#667085]">Use guided setup to change the starter, theme, logo, and defaults together.</p>
        <button type="button" onClick={onOpenSetup} className="h-10 rounded-lg border border-[#d9dee7] bg-white px-4 text-sm font-medium text-[#344054] transition hover:border-[#b9adff] hover:text-[#4f3fe0]">
          Open guided setup
        </button>
      </div>
    </SettingsPanel>
  );
}

function SeoSettingsPanel({
  graph,
  onPatch,
}: {
  graph: ContentGraph;
  onPatch: (updater: (draft: ContentGraph) => void) => void;
}) {
  return (
    <SettingsPanel title="SEO defaults" description="Fallback metadata used when a page does not provide its own values.">
      <div className="grid gap-5">
        <Field label="Default title pattern">
          <TextInput value={graph.site.defaultTitlePattern} onChange={(event) => onPatch((draft) => { draft.site.defaultTitlePattern = event.target.value; })} />
        </Field>
        <Field label="Default description">
          <TextArea rows={4} value={graph.site.defaultDescription} onChange={(event) => onPatch((draft) => { draft.site.defaultDescription = event.target.value; })} />
        </Field>
        <Field label="Default social image">
          <TextInput value={graph.site.defaultOgImage} onChange={(event) => onPatch((draft) => { draft.site.defaultOgImage = event.target.value; })} />
        </Field>
      </div>
    </SettingsPanel>
  );
}

function ComponentPacksSettingsPanel({
  graph,
  onPatch,
  isBuilderMode,
}: {
  graph: ContentGraph;
  onPatch: (updater: (draft: ContentGraph) => void) => void;
  isBuilderMode: boolean;
}) {
  const enabledPacks = new Set(graph.site.enabledPacks ?? packManifests.map((manifest) => manifest.id));

  return (
    <div className="space-y-6">
      <SettingsPanel
        title="Access mode"
        description="Access is controlled by each workspace member's role, so developers can build without exposing those controls to content editors."
      >
        <div className={`rounded-xl border p-4 ${isBuilderMode ? "border-[#9b8cff] bg-[#f4f1ff]" : "border-[#e4e7ec] bg-[#f8fafc]"}`}>
          <span className="text-sm font-semibold text-[#101828]">{isBuilderMode ? "Builder mode" : "Client mode"}</span>
          <p className="mt-1 text-sm leading-6 text-[#667085]">{isBuilderMode ? "Your role can access the complete installed component catalogue, models, and builder tools." : "Your role can edit content using only the approved components and fields."}</p>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Component packs"
        description="Enable the component families this website needs. Disabling a pack hides it from Client mode without deleting existing content."
      >
        {isBuilderMode && (
          <a
            href="/cms/foundation"
            className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-[#d8d2ff] bg-[#f6f4ff] p-4 text-left transition hover:border-[#a99cff] hover:bg-[#f0edff]"
          >
            <span>
              <strong className="block text-sm font-semibold text-[#3325a8]">Open component and theme matrix</strong>
              <span className="mt-1 block text-sm leading-6 text-[#667085]">Compare the 15 foundation components across Editorial Travel, Clean SaaS, and Studio Agency.</span>
            </span>
            <span aria-hidden="true" className="text-xl text-[#6d5dfc]">→</span>
          </a>
        )}
        <div className="divide-y divide-[#e4e7ec]">
          {packManifests.map((manifest) => {
            const enabled = enabledPacks.has(manifest.id);
            const required = manifest.kind === "core";
            const availableBlockCount = manifest.blocks.filter((registration) =>
              blockDefinitions.some((definition) => definition.type === registration.type)
            ).length;
            const available = availableBlockCount > 0;

            return (
              <label key={manifest.id} className="flex cursor-pointer items-start gap-4 py-4 first:pt-0 last:pb-0">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={required || !available}
                  onChange={(event) => {
                    const shouldEnable = event.target.checked;
                    onPatch((draft) => {
                      const next = new Set(draft.site.enabledPacks ?? packManifests.map((item) => item.id));
                      if (shouldEnable) next.add(manifest.id);
                      else next.delete(manifest.id);
                      next.add("core");
                      draft.site.enabledPacks = Array.from(next);
                    });
                  }}
                  className="mt-1 h-4 w-4 rounded border-[#d0d5dd] text-[#6d5dfc] focus:ring-[#6d5dfc]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold text-[#101828]">{manifest.name}</strong>
                    <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
                      {required
                        ? "Required"
                        : available
                          ? `${availableBlockCount} components`
                          : `${manifest.blocks.length} mapped`}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#667085]">{manifest.description}</span>
                  {!available && (
                    <span className="mt-1 block text-xs font-medium text-amber-700">
                      The existing client implementations are mapped and will become available after extraction.
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </SettingsPanel>
    </div>
  );
}

function PublishingSettingsPanel() {
  return (
    <SettingsPanel title="Publishing and integrations" description="How saved content reaches the public website.">
      <div className="space-y-5 text-sm leading-6 text-[#475467]">
        <div>
          <h3 className="font-semibold text-[#101828]">Drafts save automatically</h3>
          <p>Editing stores a private draft. Visitors continue to see the last published snapshot.</p>
        </div>
        <div className="border-t border-[#e4e7ec] pt-5">
          <h3 className="font-semibold text-[#101828]">Publishing is site-wide</h3>
          <p>Publish promotes the complete saved content graph so pages, navigation, and shared sections stay consistent.</p>
        </div>
        <div className="border-t border-[#e4e7ec] pt-5">
          <h3 className="font-semibold text-[#101828]">Deployment hook</h3>
          <p>The server-side <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 text-xs">CMS_PUBLISH_WEBHOOK_URL</code> triggers the production rebuild after a successful publish.</p>
        </div>
      </div>
    </SettingsPanel>
  );
}

function WebsiteSetupModal({
  graph,
  onClose,
  onApply,
}: {
  graph: ContentGraph;
  onClose: () => void;
  onApply: (input: WebsiteSetupDraft) => void;
}) {
  const [draft, setDraft] = useState<WebsiteSetupDraft>(() => createWebsiteSetupDraft(graph));
  const selectedStarter = starterDefinitions.find((starter) => starter.id === draft.starterId) ?? starterDefinitions[0];
  const selectedTheme = getThemePreset(draft.themeId, draft);
  const update = <K extends keyof WebsiteSetupDraft>(key: K, value: WebsiteSetupDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const applyThemePreset = (themeId: string) => {
    const design = createDesignFromThemePreset(themeId);
    setDraft((current) => ({
      ...current,
      themeId: design.themeId,
      primaryColor: design.primaryColor,
      accentColor: design.accentColor,
      backgroundColor: design.backgroundColor,
      textColor: design.textColor,
      headingFont: design.headingFont,
      bodyFont: design.bodyFont,
      radius: design.radius,
    }));
  };
  const applyStarterSelection = (starterId: string) => {
    const design = createDesignFromThemePreset(starterThemeDefaults[starterId] ?? draft.themeId);
    setDraft((current) => ({
      ...current,
      starterId,
      themeId: design.themeId,
      primaryColor: design.primaryColor,
      accentColor: design.accentColor,
      backgroundColor: design.backgroundColor,
      textColor: design.textColor,
      headingFont: design.headingFont,
      bodyFont: design.bodyFont,
      radius: design.radius,
    }));
  };
  const siteUrlPreview = normalizeSiteUrl(draft.siteUrl) || "https://example.com";
  const checklist = [
    ["Tenant", "Set CMS_TENANT_ID and CMS_SITE_ID for this client."],
    ["Database", "Use database storage when this site should live outside Git commits."],
    ["Media", "Create the media bucket/path before uploading production assets."],
    ["Deploy", "Add the Netlify build hook when publish should rebuild the live site."],
  ];

  return (
    <CmsDialog
      open
      onClose={onClose}
      eyebrow="Client setup"
      title="Setup website"
      description="Choose a starter, set the client identity, domain, SEO defaults, and brand tokens before editing pages."
      maxWidthClassName="sm:max-w-5xl"
      bodyClassName="p-4 sm:p-5"
      formProps={{
        onSubmit: (event) => {
          event.preventDefault();
          onApply(draft);
        },
      }}
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-[#667085]">
            Save draft after setup when you want these settings written to storage.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-slate-950 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white shadow-lg shadow-slate-950/20 transition hover:bg-violet-700"
            >
              Apply Setup
            </button>
          </div>
        </div>
      )}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#667085]">Starter</p>
                    <h3 className="mt-1 text-base font-bold text-slate-950">Pick the site shape</h3>
                  </div>
                  {selectedStarter?.advanced && (
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-teal-700">
                      Adds models
                    </span>
                  )}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {starterDefinitions.map((starter) => (
                    <button
                      key={starter.id}
                      type="button"
                      onClick={() => applyStarterSelection(starter.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        draft.starterId === starter.id
                          ? "border-violet-200 bg-violet-50 ring-1 ring-violet-100"
                          : "border-[#e4e7ec] bg-[#f8fafc]/70 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <span className="block text-[12px] font-bold text-slate-950">{starter.label}</span>
                      <span className="mt-1 block text-[11px] font-medium leading-4 text-[#667085]">{starter.description}</span>
                    </button>
                  ))}
                </div>
                {selectedStarter && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedStarter.pages.map((page) => (
                      <span key={page} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                        {page}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#667085]">Identity and domain</p>
                  <h3 className="mt-1 text-base font-bold text-slate-950">Make it unique to this client</h3>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Site Name">
                    <TextInput value={draft.siteName} onChange={(event) => update("siteName", event.target.value)} placeholder="Client Business" />
                  </Field>
                  <Field label="Production Domain">
                    <TextInput value={draft.siteUrl} onChange={(event) => update("siteUrl", event.target.value)} placeholder="client.com" />
                  </Field>
                  <Field label="Logo URL">
                    <TextInput value={draft.logo} onChange={(event) => update("logo", event.target.value)} placeholder="/uploads/logo.svg" />
                  </Field>
                  <Field label="Favicon URL">
                    <TextInput value={draft.favicon} onChange={(event) => update("favicon", event.target.value)} placeholder="/favicon.ico" />
                  </Field>
                  <Field label="Default OG Image">
                    <TextInput value={draft.defaultOgImage} onChange={(event) => update("defaultOgImage", event.target.value)} placeholder="/uploads/og.jpg" />
                  </Field>
                  <Field label="Organization Name">
                    <TextInput value={draft.organizationName} onChange={(event) => update("organizationName", event.target.value)} placeholder={draft.siteName} />
                  </Field>
                  <Field label="Default Locale">
                    <TextInput value={draft.defaultLocale} onChange={(event) => update("defaultLocale", event.target.value)} placeholder="en" />
                  </Field>
                  <Field label="Default Description">
                    <TextArea rows={3} value={draft.defaultDescription} onChange={(event) => update("defaultDescription", event.target.value)} placeholder="Short default SEO description." />
                  </Field>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#667085]">Brand tokens</p>
                    <h3 className="mt-1 text-base font-bold text-slate-950">Colors and type</h3>
                  </div>
                  <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <span className="h-8 w-12" style={{ background: draft.primaryColor }} />
                    <span className="h-8 w-12" style={{ background: draft.accentColor }} />
                    <span className="h-8 w-12" style={{ background: draft.textColor }} />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Theme Preset">
                    <select
                      className={selectChromeClass}
                      value={selectedTheme.id}
                      onChange={(event) => applyThemePreset(event.target.value)}
                    >
                      {themePresetOptions.map((theme) => (
                        <option key={theme.value} value={theme.value}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-[11px] font-medium leading-4 text-[#667085]">
                      {selectedTheme.description}
                    </p>
                  </Field>
                  <div className="rounded-xl border border-[#e4e7ec] bg-[#f8fafc]/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#667085]">Best for</p>
                    <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-700">{selectedTheme.bestFor}</p>
                  </div>
                  <ColorField label="Primary Color" value={draft.primaryColor} onChange={(value) => update("primaryColor", value)} />
                  <ColorField label="Accent Color" value={draft.accentColor} onChange={(value) => update("accentColor", value)} />
                  <ColorField label="Background" value={draft.backgroundColor} onChange={(value) => update("backgroundColor", value)} />
                  <ColorField label="Text Color" value={draft.textColor} onChange={(value) => update("textColor", value)} />
                  <Field label="Heading Font">
                    <select
                      className={selectChromeClass}
                      value={draft.headingFont}
                      onChange={(event) => update("headingFont", event.target.value)}
                    >
                      {fontSelectOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Body Font">
                    <select
                      className={selectChromeClass}
                      value={draft.bodyFont}
                      onChange={(event) => update("bodyFont", event.target.value)}
                    >
                      {fontSelectOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Corner Radius">
                    <select
                      className={selectChromeClass}
                      value={draft.radius}
                      onChange={(event) => update("radius", event.target.value as WebsiteSetupDraft["radius"])}
                    >
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                    </select>
                  </Field>
                </div>
              </section>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-700">Preview</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-black text-white" style={{ background: draft.primaryColor }}>
                      {(draft.siteName.trim() || "B").slice(0, 1)}
                    </span>
                    <span className="truncate text-[12px] font-bold text-slate-950">{draft.siteName || "New Website"}</span>
                  </div>
                  <div className="p-4" style={{ background: draft.backgroundColor, color: draft.textColor }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: draft.accentColor }}>
                      {selectedStarter?.label ?? "Starter"}
                    </p>
                    <h4 className="mt-2 text-xl font-black tracking-[-0.04em]">{draft.siteName || "Client website"}</h4>
                    <p className="mt-2 text-[12px] leading-5 opacity-75">{draft.defaultDescription || "Default SEO and brand description."}</p>
                    <div className="mt-4 rounded-lg px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.1em] text-white" style={{ background: draft.primaryColor }}>
                      Primary action
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#667085]">Domain</p>
                  <p className="mt-1 truncate font-mono text-[11px] font-semibold text-slate-700">{siteUrlPreview}</p>
                </div>
              </section>

              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">Manual project checklist</p>
                <div className="mt-3 grid gap-2">
                  {checklist.map(([label, text]) => (
                    <div key={label} className="rounded-lg border border-amber-200 bg-white/70 p-3">
                      <p className="text-[11px] font-bold text-slate-950">{label}</p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-600">{text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold text-slate-950">What this does</p>
                <p className="mt-2 text-[11px] leading-5 text-[#667085]">
                  Applies starter pages/navigation, updates global site config, organization data, SEO defaults, and design tokens. Existing extra content is kept.
                </p>
              </section>
            </aside>
      </div>
    </CmsDialog>
  );
}

function ConceptInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-teal-700">Content help</p>
            <h2 className="mt-0.5 text-xl font-bold tracking-[-0.03em] text-slate-950">
              What is a page, collection, or category?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-xl font-light text-[#667085] shadow-sm transition hover:border-teal-300 hover:text-teal-700"
          >
            x
          </button>
        </div>
        <div className="space-y-3 bg-slate-50/70 p-5">
          <section className="rounded-xl border border-teal-200 bg-teal-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Quick answer: is /blog a category or collection?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-teal-800">/blog/</code> is normally the Blog section for a collection. Blog posts are entries inside it, like{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-teal-800">/blog/how-to-rent-a-car/</code>.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              A category is a topic inside a collection, like Guides, News, or Deals. In this CMS, public category pages use routes like{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-teal-800">/category/guides/</code>.
            </p>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">Page</p>
              <h3 className="mt-2 text-base font-semibold text-slate-950">One-off screen</h3>
              <p className="mt-2 text-sm leading-6 text-[#475467]">Use for Home, About, Contact, Pricing, or a landing page.</p>
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">/about/</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">Collection</p>
              <h3 className="mt-2 text-base font-semibold text-slate-950">Repeatable content type</h3>
              <p className="mt-2 text-sm leading-6 text-[#475467]">Use for Blog posts, Cars, Tours, Products, Jobs, Team members.</p>
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">/blog/my-post/</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">Category</p>
              <h3 className="mt-2 text-base font-semibold text-slate-950">Topic or group</h3>
              <p className="mt-2 text-sm leading-6 text-[#475467]">Use for Guides, News, Electric cars, Europe trips, Deals.</p>
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">/category/guides/</div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-950">Real examples</h3>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <div className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <strong className="text-slate-900">Blog website</strong>
                <span>Collection: Blog. Entry: "Best rental tips". Category: Guides. URLs: <code className="font-mono text-xs">/blog/best-rental-tips/</code> and <code className="font-mono text-xs">/category/guides/</code>.</span>
              </div>
              <div className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <strong className="text-slate-900">Car rental</strong>
                <span>Collection: Cars. Entry: "BMW X5". Category: SUVs. URL: <code className="font-mono text-xs">/cars/bmw-x5/</code>.</span>
              </div>
              <div className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <strong className="text-slate-900">Travel agency</strong>
                <span>Collection: Tours. Entry: "Paris weekend". Category: Europe. URL: <code className="font-mono text-xs">/tours/paris-weekend/</code>.</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Important</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Turn on <strong>Build collection index page</strong> inside a collection to create the clean listing route, like{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-amber-800">/blog/</code>. Entries still live under it, like{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-amber-800">/blog/my-post/</code>.
            </p>
          </section>
        </div>
        <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-950 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-teal-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function SiteDesignPanel({
  graph,
  onPatch,
}: {
  graph: ContentGraph;
  onPatch: (updater: (draft: ContentGraph) => void) => void;
}) {
  const design = { ...fallbackDesign, ...graph.site.design };
  const selectedTheme = getThemePreset(design.themeId, design);
  const updateDesign = (updates: Partial<typeof design>) =>
    onPatch((draft) => {
      draft.site.design = { ...design, ...draft.site.design, ...updates };
    });
  const applyThemePreset = (themeId: string) => {
    updateDesign(createDesignFromThemePreset(themeId));
  };

  return (
    <section className="rounded-xl border border-[#e4e7ec] bg-white">
      <div className="border-b border-[#e4e7ec] px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#101828]">Brand and design</h2>
        <p className="mt-1 text-sm leading-6 text-[#667085]">Logo, colors, typography, and shape across the public website.</p>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Logo URL">
          <TextInput
            value={graph.site.logo ?? ""}
            onChange={(event) => onPatch((draft) => {
              draft.site.logo = event.target.value;
              draft.site.organization.logo = event.target.value;
            })}
          />
        </Field>
        <Field label="Favicon URL">
          <TextInput value={graph.site.favicon ?? ""} onChange={(event) => onPatch((draft) => { draft.site.favicon = event.target.value; })} />
        </Field>
      </div>

      <div className="border-t border-[#e4e7ec] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#101828]">Design system</h3>
            <p className="mt-1 text-sm text-[#667085]">Base colors and typography for public pages.</p>
          </div>
          <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <span className="h-10 w-16" style={{ background: design.primaryColor }} />
            <span className="h-10 w-16" style={{ background: design.accentColor }} />
            <span className="h-10 w-16" style={{ background: design.textColor }} />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Theme Preset">
            <select
              className={selectChromeClass}
              value={selectedTheme.id}
              onChange={(event) => applyThemePreset(event.target.value)}
            >
              {themePresetOptions.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] font-medium leading-4 text-[#667085]">
              {selectedTheme.description}
            </p>
          </Field>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#667085]">Best for</p>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-700">{selectedTheme.bestFor}</p>
          </div>
          <ColorField label="Primary Color" value={design.primaryColor} onChange={(value) => updateDesign({ primaryColor: value })} />
          <ColorField label="Accent Color" value={design.accentColor} onChange={(value) => updateDesign({ accentColor: value })} />
          <ColorField label="Background" value={design.backgroundColor} onChange={(value) => updateDesign({ backgroundColor: value })} />
          <ColorField label="Text Color" value={design.textColor} onChange={(value) => updateDesign({ textColor: value })} />
          <Field label="Heading Font">
            <select
              className={selectChromeClass}
              value={design.headingFont}
              onChange={(event) => updateDesign({ headingFont: event.target.value })}
            >
              {fontSelectOptions.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Body Font">
            <select
              className={selectChromeClass}
              value={design.bodyFont}
              onChange={(event) => updateDesign({ bodyFont: event.target.value })}
            >
              {fontSelectOptions.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Corner Radius">
            <select
              className={selectChromeClass}
              value={design.radius}
              onChange={(event) => updateDesign({ radius: event.target.value as "sm" | "md" | "lg" })}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </Field>
        </div>
      </div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-14 shrink-0 rounded-xl border border-slate-200 bg-white p-1"
        />
        <TextInput value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </Field>
  );
}
