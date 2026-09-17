import { useEffect, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { cloneBlockValue, cloneDefaultBlockContent } from "../blocks/registry";
import { createBlocksFromBlueprint } from "../blueprints/registry";
import { validateContentGraph } from "../lib/cms/validation";
import { getBlueprint } from "../packs/registry";
import {
  clone,
  createEntry,
  createId,
  createPage,
  createSharedBlock,
  emptySeo,
  makeUniqueSlug,
  makeUniqueValue,
  now,
} from "./contentUtils";
import {
  readInitialTab,
  readStoredSelection,
  reconcileSelection,
  writeStoredSelection,
  writeStoredTab,
  writeUrlTab,
} from "./storageState";
import { BlockType, type BlockTypeId, type AssetMeta, type BlockData, type Category, type CollectionDefinition, type CollectionEntry, type ContentGraph, type PageContent, type ValidationIssue } from "../../types";
import type { CmsTab, CreateContentInput, Selection } from "./types";
import { getContentLocale } from "../localization/registry";
import { cmsApiUrl, type CmsWorkspaceScope } from "../lib/cms/workspaceTypes";

export type BlockInsertOptions = {
  afterBlockId?: string | null;
  atIndex?: number;
  initialContent?: Record<string, unknown>;
};

const resolveBlockInsertIndex = (blocks: BlockData[], options?: BlockInsertOptions) => {
  if (typeof options?.atIndex === "number") {
    return Math.max(0, Math.min(options.atIndex, blocks.length));
  }

  if (options?.afterBlockId) {
    const index = blocks.findIndex((block) => block.id === options.afterBlockId);
    if (index >= 0) return index + 1;
  }

  return blocks.length;
};

const insertBlock = (blocks: BlockData[], block: BlockData, options?: BlockInsertOptions) => {
  const next = [...blocks];
  next.splice(resolveBlockInsertIndex(next, options), 0, block);
  return next;
};

export function useCmsController(workspace: CmsWorkspaceScope) {

  const apiUrl = (path: string) => cmsApiUrl(path, workspace);

  const [graph, setGraph] = useState<ContentGraph | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [activeTab, setActiveTab] = useState<CmsTab>(() => readInitialTab());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [blocksDraft, setBlocksDraft] = useState("[]");
  const [blocksError, setBlocksError] = useState("");
  const [navigationDraft, setNavigationDraft] = useState("[]");
  const [navigationError, setNavigationError] = useState("");
  const [redirectsDraft, setRedirectsDraft] = useState("[]");
  const [redirectsError, setRedirectsError] = useState("");
  const changeVersionRef = useRef(0);
  const autoSaveInFlightRef = useRef(false);

  const selectedItem =
    graph && selection?.kind === "page"
      ? graph.pages.find((page) => page.id === selection.id)
      : graph && selection?.kind === "entry"
        ? graph.entries.find((entry) => entry.id === selection.id)
        : null;

  const selectedDefinition =
    graph && selectedItem && "collectionId" in selectedItem
      ? graph.collectionDefinitions.find((definition) => definition.id === selectedItem.collectionId)
      : null;

  const selectedBlock = activeBlockId ? selectedItem?.blocks.find((block) => block.id === activeBlockId) ?? null : null;

  const loadContent = async () => {
    setIsBusy(true);
    setMessage("");
    setLoadError("");

    try {
      const response = await fetch(apiUrl("/api/cms/content"));
      if (response.status === 401) {
        window.location.href = "/cms";
        return;
      }

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load CMS content.");
      }

      changeVersionRef.current = 0;
      setGraph(payload.graph);
      setIssues(payload.issues ?? []);
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
      const storedSelection = readStoredSelection();
      setSelection((current) => reconcileSelection(payload.graph, current ?? storedSelection));
      setNavigationDraft(JSON.stringify(payload.graph.navigation, null, 2));
      setRedirectsDraft(JSON.stringify(payload.graph.redirects, null, 2));
    } catch (error) {
      const nextError = error instanceof Error ? error.message : "Unable to load CMS content.";
      setLoadError(nextError);
      setMessage(nextError);
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    loadContent().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load CMS content.");
      setIsBusy(false);
    });
  }, [workspace.tenantId, workspace.siteId]);

  useEffect(() => {
    if (!graph) return;
    setIssues(validateContentGraph(graph));
  }, [graph]);

  useEffect(() => {
    if (selection) writeStoredSelection(selection);
  }, [selection]);

  useEffect(() => {
    writeStoredTab(activeTab);
    writeUrlTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  useEffect(() => {
    setBlocksDraft(JSON.stringify(selectedItem?.blocks ?? [], null, 2));
    setBlocksError("");
  }, [selectedItem?.id, selectedItem?.blocks]);

  useEffect(() => {
    setActiveBlockId((current) => {
      if (!selectedItem) return null;
      if (current && selectedItem.blocks.some((block) => block.id === current)) return current;
      return selectedItem.blocks[0]?.id ?? null;
    });
  }, [selectedItem?.id, selectedItem?.blocks]);

  const patchGraph = (updater: (draft: ContentGraph) => void) => {
    changeVersionRef.current += 1;
    setIsDirty(true);
    setMessage("Unsaved changes");
    setGraph((current) => {
      if (!current) return current;
      const next = clone(current);
      updater(next);
      next.updatedAt = now();
      return next;
    });
  };

  const patchSelected = (updater: (item: PageContent | CollectionEntry) => void) => {
    if (!selection) return;

    patchGraph((draft) => {
      const list = selection.kind === "page" ? draft.pages : draft.entries;
      const item = list.find((candidate) => candidate.id === selection.id);
      if (!item) return;
      updater(item as PageContent | CollectionEntry);
      item.updatedAt = now();
    });
  };

  const patchSelectedBlock = (blockId: string, updater: (block: BlockData) => void) => {
    patchSelected((item) => {
      const block = item.blocks.find((candidate) => candidate.id === blockId);
      if (!block) return;
      updater(block);
    });
  };

  const removeSelectedBlock = (blockId: string) => {
    let nextActiveBlockId: string | null = null;

    patchSelected((item) => {
      const blockIndex = item.blocks.findIndex((block) => block.id === blockId);
      const remainingBlocks = item.blocks.filter((block) => block.id !== blockId);
      nextActiveBlockId = remainingBlocks[Math.min(blockIndex, remainingBlocks.length - 1)]?.id ?? null;
      item.blocks = remainingBlocks;
    });
    setActiveBlockId((current) => (current === blockId ? nextActiveBlockId : current));
  };

  const duplicateSelectedBlock = (blockId: string) => {
    let duplicatedBlockId: string | null = null;

    patchSelected((item) => {
      const blockIndex = item.blocks.findIndex((block) => block.id === blockId);
      if (blockIndex < 0) return;

      const duplicate = {
        ...clone(item.blocks[blockIndex]),
        id: createId("block"),
      };
      duplicatedBlockId = duplicate.id;
      item.blocks.splice(blockIndex + 1, 0, duplicate);
    });
    if (duplicatedBlockId) setActiveBlockId(duplicatedBlockId);
  };

  const moveSelectedBlock = (blockId: string, direction: -1 | 1) => {
    patchSelected((item) => {
      const index = item.blocks.findIndex((block) => block.id === blockId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= item.blocks.length) return;
      const [block] = item.blocks.splice(index, 1);
      item.blocks.splice(nextIndex, 0, block);
    });
  };

  const reorderSelectedBlocks = (activeId: string, overId: string) => {
    if (activeId === overId) return;

    patchSelected((item) => {
      const oldIndex = item.blocks.findIndex((block) => block.id === activeId);
      const newIndex = item.blocks.findIndex((block) => block.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;
      item.blocks = arrayMove(item.blocks, oldIndex, newIndex);
    });
    setActiveBlockId(activeId);
  };

  const duplicateSelectedContent = () => {
    if (!graph || !selection || !selectedItem) return;

    const duplicate = clone(selectedItem) as PageContent | CollectionEntry;
    duplicate.id = createId(selection.kind);
    if (selection.kind === "page") {
      const page = selectedItem as PageContent;
      const siblings = graph.pages.filter(
        (candidate) => candidate.id !== page.id && (candidate.parentId ?? null) === (page.parentId ?? null),
      );
      duplicate.title = makeUniqueValue(`${selectedItem.title} Copy`, siblings.map((candidate) => candidate.title));
      duplicate.slug = makeUniqueSlug(`${selectedItem.slug}-copy`, siblings.map((candidate) => candidate.slug));
    } else {
      const entry = selectedItem as CollectionEntry;
      const siblings = graph.entries.filter(
        (candidate) => candidate.id !== entry.id && candidate.collectionId === entry.collectionId,
      );
      duplicate.title = makeUniqueValue(`${selectedItem.title} Copy`, siblings.map((candidate) => candidate.title));
      duplicate.slug = makeUniqueSlug(`${selectedItem.slug}-copy`, siblings.map((candidate) => candidate.slug));
    }
    duplicate.status = "draft";
    duplicate.updatedAt = now();
    duplicate.blocks = duplicate.blocks.map((block) => ({ ...block, id: createId("block") }));
    duplicate.seo = {
      ...duplicate.seo,
      title: duplicate.title,
      canonical: undefined,
    };

    if ("name" in duplicate) duplicate.name = duplicate.title;

    patchGraph((draft) => {
      if (selection.kind === "page") {
        draft.pages.push(duplicate as PageContent);
      } else {
        draft.entries.push(duplicate as CollectionEntry);
      }
    });
    setSelection({ kind: selection.kind, id: duplicate.id });
  };

  const deleteSelectedContent = () => {
    if (!selection || !selectedItem) return;
    if (!window.confirm(`Delete "${selectedItem.title}"?`)) return;

    patchGraph((draft) => {
      if (selection.kind === "page") {
        draft.pages = draft.pages.filter((page) => page.id !== selection.id);
        draft.pages.forEach((page) => {
          if (page.parentId === selection.id) page.parentId = null;
        });
      } else {
        draft.entries = draft.entries.filter((entry) => entry.id !== selection.id);
      }
    });

    const remainingPage = graph.pages.find((page) => page.id !== selection.id);
    const remainingEntry = graph.entries.find((entry) => entry.id !== selection.id);
    setSelection(remainingPage ? { kind: "page", id: remainingPage.id } : remainingEntry ? { kind: "entry", id: remainingEntry.id } : null);
  };

  const saveDraft = async (options: { silent?: boolean } = {}) => {
    if (!graph) return;
    const version = changeVersionRef.current;
    if (!options.silent) setIsBusy(true);
    setMessage(options.silent ? "Saving changes…" : "Saving draft…");

    try {
      const response = await fetch(apiUrl("/api/cms/content"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ graph }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Draft save failed. Retry when ready.");
        return;
      }

      setIssues(payload.issues ?? []);
      if (version === changeVersionRef.current) {
        setGraph(payload.graph);
        setIsDirty(false);
        setLastSavedAt(new Date().toISOString());
        setMessage("All changes saved");
      } else {
        setMessage("Saving latest changes…");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Draft save failed. Retry when ready.");
    } finally {
      if (!options.silent) setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!graph || !isDirty || isBusy || autoSaveInFlightRef.current) return;
    const timer = window.setTimeout(async () => {
      autoSaveInFlightRef.current = true;
      try {
        await saveDraft({ silent: true });
      } finally {
        autoSaveInFlightRef.current = false;
      }
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [graph?.updatedAt, isDirty, isBusy]);

  const publishSnapshot = async (options: { scope?: "all" | "page"; pageId?: string } = {}) => {
    if (!graph) return;

    const page = options.scope === "page"
      ? graph.pages.find((candidate) => candidate.id === options.pageId)
      : null;
    if (options.scope === "page" && !page) {
      setMessage("The selected page could not be found.");
      return;
    }

    setIsBusy(true);
    setMessage(options.scope === "page" ? `Publishing ${page!.title}...` : "Publishing snapshot...");

    try {
      const publishResponse = await fetch(apiUrl("/api/cms/publish"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          graph,
          scope: options.scope ?? "all",
          ...(options.scope === "page" ? { pageId: options.pageId } : {}),
        }),
      });
      const publishPayload = await publishResponse.json();

      setIssues(publishPayload.issues ?? []);

      if (!publishResponse.ok) {
        const firstError = Array.isArray(publishPayload.issues)
          ? publishPayload.issues.find((issue: ValidationIssue) => issue.level === "error")
          : null;
        setMessage(
          publishPayload.error || firstError?.message || "Publish blocked by validation errors.",
        );
        return;
      }

      const nextGraph = publishPayload.graph ?? graph;
      setGraph(nextGraph);
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
      const publishWarnings = Array.isArray(publishPayload.warnings)
        ? publishPayload.warnings.filter((warning: unknown) => typeof warning === "string")
        : [];
      setMessage(
        publishWarnings.length > 0
          ? publishWarnings.join(" ")
          : options.scope === "page"
            ? `Published ${page!.title}. Other draft changes remain unpublished.`
            : "Published draft and public snapshot.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Publish failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const uploadAsset = async (input: { file: File; alt?: string; folder?: string; tags?: string }) => {
    if (!graph) return null;

    const formData = new FormData();
    formData.append("file", input.file);
    formData.append("alt", input.alt ?? "");
    formData.append("folder", input.folder ?? "");
    formData.append("tags", input.tags ?? "");
    formData.append("graph", JSON.stringify(graph));

    setIsBusy(true);
    setMessage("Uploading media...");

    try {
      const response = await fetch(apiUrl("/api/cms/media/upload"), {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Media upload failed.");
      }

      setGraph(payload.graph);
      setIssues(payload.issues ?? []);
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
      setMessage("Media uploaded.");
      return payload.asset as AssetMeta;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Media upload failed.");
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const replaceAsset = async (assetId: string, file: File) => {
    if (!graph) return null;

    const formData = new FormData();
    formData.append("assetId", assetId);
    formData.append("file", file);
    formData.append("graph", JSON.stringify(graph));

    setIsBusy(true);
    setMessage("Replacing media...");

    try {
      const response = await fetch(apiUrl("/api/cms/media/replace"), {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Media replace failed.");
      }

      setGraph(payload.graph);
      setIssues(payload.issues ?? []);
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
      setMessage("Media replaced.");
      return payload.asset as AssetMeta;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Media replace failed.");
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const patchAsset = (assetId: string, updates: Partial<AssetMeta>) => {
    patchGraph((draft) => {
      const asset = draft.assets.find((candidate) => candidate.id === assetId);
      if (!asset) return;
      Object.assign(asset, updates, { updatedAt: now() });
    });
  };

  const deleteAsset = async (assetId: string) => {
    if (!graph) return;

    setIsBusy(true);
    setMessage("Removing media...");

    try {
      const response = await fetch(apiUrl("/api/cms/media/delete"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, graph }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Media delete failed.");
      }

      setGraph(payload.graph);
      setIssues(payload.issues ?? []);
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
      setMessage("Media removed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Media delete failed.";
      setMessage(message);
      throw new Error(message);
    } finally {
      setIsBusy(false);
    }
  };

  const applyBlocksJson = () => {
    try {
      const parsed = JSON.parse(blocksDraft);
      if (!Array.isArray(parsed)) throw new Error("Blocks JSON must be an array.");
      patchSelected((item) => {
        item.blocks = parsed;
      });
      setBlocksError("");
    } catch (error) {
      setBlocksError(error instanceof Error ? error.message : "Invalid block JSON.");
    }
  };

  const addBlock = (type: BlockTypeId, options?: BlockInsertOptions) => {
    const block: BlockData = {
      id: createId("block"),
      type,
      content: {
        ...cloneDefaultBlockContent(type, graph?.site.clientExtensions),
        ...(options?.initialContent ? cloneBlockValue(options.initialContent) : {}),
      },
    };

    patchSelected((item) => {
      item.blocks = insertBlock(item.blocks, block, options);
    });
    setActiveBlockId(block.id);
    setBlocksDraft((current) => {
      try {
        const parsed = JSON.parse(current);
        return JSON.stringify(Array.isArray(parsed) ? insertBlock(parsed, block, options) : [block], null, 2);
      } catch {
        return JSON.stringify([block], null, 2);
      }
    });
  };

  const addSharedBlockReference = (sharedBlockId: string, options?: BlockInsertOptions) => {
    const block: BlockData = {
      id: createId("block"),
      type: BlockType.SHARED_BLOCK,
      content: { refId: sharedBlockId },
    };

    patchSelected((item) => {
      item.blocks = insertBlock(item.blocks, block, options);
    });
    setActiveBlockId(block.id);
  };

  const createSharedBlockRecord = () => {
    const sharedBlock = createSharedBlock();
    patchGraph((draft) => {
      draft.sharedBlocks.push(sharedBlock);
    });
    setActiveTab("content");
    return sharedBlock.id;
  };

  const saveSelectedBlockAsShared = (blockId: string, name: string) => {
    if (!selection || !selectedItem) return null;

    const sourceBlock = selectedItem.blocks.find((block) => block.id === blockId);
    if (!sourceBlock || sourceBlock.type === BlockType.SHARED_BLOCK) return null;

    const sharedBlock = createSharedBlock(sourceBlock, name);

    patchGraph((draft) => {
      draft.sharedBlocks.push(sharedBlock);
      const list = selection.kind === "page" ? draft.pages : draft.entries;
      const item = list.find((candidate) => candidate.id === selection.id);
      const block = item?.blocks.find((candidate) => candidate.id === blockId);
      if (!block) return;

      block.type = BlockType.SHARED_BLOCK;
      block.content = { refId: sharedBlock.id };
    });
    setActiveBlockId(blockId);
    return sharedBlock.id;
  };

  const detachSharedBlockReference = (blockId: string) => {
    if (!selection) return;

    patchGraph((draft) => {
      const list = selection.kind === "page" ? draft.pages : draft.entries;
      const item = list.find((candidate) => candidate.id === selection.id);
      const blockIndex = item?.blocks.findIndex((candidate) => candidate.id === blockId) ?? -1;
      const block = blockIndex >= 0 ? item?.blocks[blockIndex] : null;
      if (!item || !block || block.type !== BlockType.SHARED_BLOCK) return;

      const sharedBlock = draft.sharedBlocks.find((candidate) => candidate.id === block.content?.refId);
      if (!sharedBlock || sharedBlock.block.type === BlockType.SHARED_BLOCK) return;

      item.blocks[blockIndex] = {
        ...clone(sharedBlock.block),
        id: block.id,
      };
    });
    setActiveBlockId(blockId);
  };

  const createNewPage = (input?: CreateContentInput) => {
    const page = createPage();
    page.locale = graph && selectedItem
      ? getContentLocale(selectedItem, graph.site)
      : graph?.site.defaultLocale ?? "en";
    page.translationGroupId = page.id;
    const blueprint = input?.blueprintId
      ? getBlueprint(input.blueprintId, graph?.site.enabledPacks, graph?.customBlueprints)
      : undefined;
    const parentId = input?.parentId ?? null;
    const siblingPages = graph?.pages.filter((candidate) => (candidate.parentId ?? null) === parentId) ?? [];
    page.title = makeUniqueValue(input?.title || "New Page", siblingPages.map((candidate) => candidate.title));
    page.name = page.title;
    page.navigationLabel = page.title;
    page.slug = makeUniqueSlug(input?.slug || page.title, siblingPages.map((candidate) => candidate.slug));
    page.status = input?.status ?? "draft";
    page.parentId = parentId;
    if (blueprint?.subject === "page") {
      page.templateId = blueprint.templateId;
      page.blocks = createBlocksFromBlueprint(blueprint, {
        title: page.title,
        fields: input?.fields,
      });
    }
    page.seo.title = input?.seoTitle || page.title;
    page.seo.description = input?.seoDescription ?? "";
    page.seo.ogTitle = page.seo.title;
    page.seo.ogDescription = page.seo.description;
    patchGraph((draft) => draft.pages.push(page));
    setSelection({ kind: "page", id: page.id });
    setActiveBlockId(page.blocks[0]?.id ?? null);
    setActiveTab("editor");
  };

  const createNewEntry = (definition: CollectionDefinition, input?: CreateContentInput) => {
    const entry = createEntry(definition);
    entry.locale = graph ? getContentLocale(definition, graph.site) : "en";
    entry.translationGroupId = entry.id;
    const blueprint = input?.blueprintId
      ? getBlueprint(input.blueprintId, graph?.site.enabledPacks, graph?.customBlueprints)
      : undefined;
    const collectionEntries = graph?.entries.filter((candidate) => candidate.collectionId === definition.id) ?? [];
    entry.title = makeUniqueValue(input?.title || `New ${definition.singularName}`, collectionEntries.map((candidate) => candidate.title));
    entry.slug = makeUniqueSlug(input?.slug || entry.title, collectionEntries.map((candidate) => candidate.slug));
    entry.status = input?.status ?? "draft";
    entry.fields = {
      ...entry.fields,
      ...(blueprint?.defaults?.fields ?? {}),
      ...(input?.fields ?? {}),
    };
    if (blueprint?.subject === "entry") {
      entry.templateId = blueprint.templateId;
      entry.blocks = createBlocksFromBlueprint(blueprint, {
        title: entry.title,
        fields: entry.fields,
        collection: definition,
      });
    }
    entry.seo.title = input?.seoTitle || entry.title;
    entry.seo.description = input?.seoDescription ?? "";
    entry.seo.ogTitle = entry.seo.title;
    entry.seo.ogDescription = entry.seo.description;
    patchGraph((draft) => {
      if (!draft.collectionDefinitions.some((candidate) => candidate.id === definition.id)) {
        draft.collectionDefinitions.push(clone(definition));
      }
      draft.entries.push(entry);
    });
    setSelection({ kind: "entry", id: entry.id });
    setActiveBlockId(entry.blocks[0]?.id ?? null);
    setActiveTab("editor");
  };

  const addPresetCollection = (preset: CollectionDefinition) => {
    if (!graph) return;
    const next = clone(preset);
    next.id = graph.collectionDefinitions.some((definition) => definition.id === preset.id)
      ? createId("collection")
      : preset.id;
    next.updatedAt = now();
    next.locale = next.locale ?? graph.site.defaultLocale;
    next.translationGroupId = next.translationGroupId ?? next.id;

    patchGraph((draft) => {
      draft.collectionDefinitions.push(next);
    });
    setActiveTab("content");

    return next.id;
  };

  const addCategory = () => {
    const category: Category = {
      id: createId("category"),
      locale: graph?.site.defaultLocale ?? "en",
      name: "New Category",
      slug: "new-category",
      description: "",
      indexTemplateId: "category-index",
      publicIndex: false,
      collectionIds: [],
      updatedAt: now(),
      seo: {
        ...emptySeo("New Category"),
        schemaType: "CollectionPage",
      },
    };
    category.translationGroupId = category.id;

    patchGraph((draft) => {
      draft.categories.push(category);
    });

    return category.id;
  };


  const applyNavigationJson = () => {
    try {
      const parsed = JSON.parse(navigationDraft);
      if (!Array.isArray(parsed)) throw new Error("Navigation JSON must be an array.");
      patchGraph((draft) => {
        draft.navigation = parsed;
      });
      setNavigationError("");
    } catch (error) {
      setNavigationError(error instanceof Error ? error.message : "Invalid navigation JSON.");
    }
  };

  const applyRedirectsJson = () => {
    try {
      const parsed = JSON.parse(redirectsDraft);
      if (!Array.isArray(parsed)) throw new Error("Redirect JSON must be an array.");
      patchGraph((draft) => {
        draft.redirects = parsed;
      });
      setRedirectsError("");
    } catch (error) {
      setRedirectsError(error instanceof Error ? error.message : "Invalid redirect JSON.");
    }
  };

  const createQuickPage = () => createNewPage();

  const createTranslation = (locale: string) => {
    if (!graph || !selection || !selectedItem) return;
    const source = selectedItem;
    const groupId = source.translationGroupId || `translation-${source.id}`;
    const siblings = selection.kind === "page" ? graph.pages : graph.entries;
    const existing = siblings.find(
      (candidate) =>
        candidate.translationGroupId === groupId &&
        getContentLocale(candidate, graph.site).toLowerCase() === locale.toLowerCase(),
    );
    if (existing) {
      setSelection({ kind: selection.kind, id: existing.id });
      setActiveBlockId(null);
      return;
    }

    const translated = clone(source);
    translated.id = createId(selection.kind);
    translated.locale = locale;
    translated.translationGroupId = groupId;
    translated.status = "draft";
    translated.path = undefined;
    translated.updatedAt = now();
    translated.seo.canonical = undefined;
    translated.blocks = translated.blocks.map((block) => ({ ...block, id: createId("block") }));

    patchGraph((draft) => {
      const sourceList = selection.kind === "page" ? draft.pages : draft.entries;
      const sourceRecord = sourceList.find((candidate) => candidate.id === source.id);
      if (sourceRecord) sourceRecord.translationGroupId = groupId;

      if (selection.kind === "page") {
        const page = translated as PageContent;
        const sourcePage = source as PageContent;
        const sourceParent = sourcePage.parentId
          ? draft.pages.find((candidate) => candidate.id === sourcePage.parentId)
          : undefined;
        const translatedParent = sourceParent?.translationGroupId
          ? draft.pages.find(
              (candidate) =>
                candidate.translationGroupId === sourceParent.translationGroupId &&
                getContentLocale(candidate, draft.site).toLowerCase() === locale.toLowerCase(),
            )
          : undefined;
        page.parentId = translatedParent?.id ?? null;
        const usedSlugs = draft.pages
          .filter(
            (candidate) =>
              (candidate.parentId ?? null) === (page.parentId ?? null) &&
              getContentLocale(candidate, draft.site).toLowerCase() === locale.toLowerCase(),
          )
          .map((candidate) => candidate.slug);
        page.slug = page.slug === "/"
          ? "/"
          : page.slug.split("/").filter(Boolean).at(-1) ?? page.slug;
        page.slug = page.slug === "/" ? "/" : makeUniqueSlug(page.slug, usedSlugs);
        draft.pages.push(page);
      } else {
        const entry = translated as CollectionEntry;
        const sourceDefinition = draft.collectionDefinitions.find(
          (definition) => definition.id === entry.collectionId,
        );
        const translatedDefinition = sourceDefinition?.translationGroupId
          ? draft.collectionDefinitions.find(
              (definition) =>
                definition.translationGroupId === sourceDefinition.translationGroupId &&
                getContentLocale(definition, draft.site).toLowerCase() === locale.toLowerCase(),
            )
          : undefined;
        entry.collectionId = translatedDefinition?.id ?? entry.collectionId;
        entry.categoryIds = entry.categoryIds.flatMap((categoryId) => {
          const sourceCategory = draft.categories.find((category) => category.id === categoryId);
          if (!sourceCategory?.translationGroupId) return [];
          const translatedCategory = draft.categories.find(
            (category) =>
              category.translationGroupId === sourceCategory.translationGroupId &&
              getContentLocale(category, draft.site).toLowerCase() === locale.toLowerCase(),
          );
          return translatedCategory ? [translatedCategory.id] : [];
        });
        const usedSlugs = draft.entries
          .filter(
            (candidate) =>
              candidate.collectionId === entry.collectionId &&
              getContentLocale(candidate, draft.site).toLowerCase() === locale.toLowerCase(),
          )
          .map((candidate) => candidate.slug);
        entry.slug = makeUniqueSlug(entry.slug, usedSlugs);
        draft.entries.push(entry);
      }
    });
    setSelection({ kind: selection.kind, id: translated.id });
    setActiveBlockId(null);
    setMessage(`Created ${locale} draft translation.`);
  };

  return {
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
    retryLoad: loadContent,
    blocksDraft,
    setBlocksDraft,
    blocksError,
    navigationDraft,
    setNavigationDraft,
    navigationError,
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
    applyBlocksJson,
    addBlock,
    addSharedBlockReference,
    createSharedBlockRecord,
    saveSelectedBlockAsShared,
    detachSharedBlockReference,
    createNewPage,
    createQuickPage,
    createNewEntry,
    createTranslation,
    addPresetCollection,
    addCategory,
    applyNavigationJson,
    applyRedirectsJson,
  };
}
