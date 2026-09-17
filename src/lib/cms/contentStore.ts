import type { ContentGraph } from "../../../types";
import {
  normalizeContentGraph,
  stringifyContentGraph,
} from "./storage/splitContent";
import { getContentStore } from "./storage";
import type { PublishContentResult } from "./storage";
import { validateContentGraph } from "./validation";
import type { CmsWorkspaceScope } from "./workspaceTypes";

export { normalizeContentGraph, stringifyContentGraph };
export { getContentStore } from "./storage";

const timestampGraph = (graph: ContentGraph) =>
  normalizeContentGraph({
    ...graph,
    updatedAt: new Date().toISOString(),
  });

export type PublishContentOptions =
  | { scope?: "all" }
  | { scope: "page"; pageId: string };

const collectStringValues = (value: unknown, values = new Set<string>()) => {
  if (typeof value === "string") {
    values.add(value);
    return values;
  }

  if (!value || typeof value !== "object") return values;
  Object.values(value).forEach((nestedValue) => collectStringValues(nestedValue, values));
  return values;
};

export const preparePagePublish = (
  draftGraph: ContentGraph,
  currentPublishedGraph: ContentGraph,
  pageId: string,
) => {
  const draftPage = draftGraph.pages.find((page) => page.id === pageId);
  if (!draftPage) throw new Error(`Page ${pageId} does not exist in the draft.`);

  const publishedPage = {
    ...draftPage,
    status: "published" as const,
    updatedAt: draftGraph.updatedAt,
  };
  const draftPages = draftGraph.pages.map((page) =>
    page.id === pageId ? publishedPage : page,
  );
  const publishedPageIndex = currentPublishedGraph.pages.findIndex((page) => page.id === pageId);
  const publishedPages = [...currentPublishedGraph.pages];

  if (publishedPageIndex >= 0) publishedPages[publishedPageIndex] = publishedPage;
  else publishedPages.push(publishedPage);

  const referencedValues = collectStringValues(publishedPage);
  const referencedAssets = draftGraph.assets.filter(
    (asset) => referencedValues.has(asset.id) || referencedValues.has(asset.url),
  );
  const publishedAssets = [...currentPublishedGraph.assets];
  referencedAssets.forEach((asset) => {
    const assetIndex = publishedAssets.findIndex((candidate) => candidate.id === asset.id);
    if (assetIndex >= 0) publishedAssets[assetIndex] = asset;
    else publishedAssets.push(asset);
  });

  return {
    draftGraph: normalizeContentGraph({
      ...draftGraph,
      pages: draftPages,
    }),
    publishedGraph: normalizeContentGraph({
      ...currentPublishedGraph,
      pages: publishedPages,
      assets: publishedAssets,
      updatedAt: draftGraph.updatedAt,
    }),
  };
};

export const getDraftContent = async (scope?: CmsWorkspaceScope): Promise<ContentGraph> =>
  getContentStore(scope).getDraft();

export const getPublishedContent = async (scope?: CmsWorkspaceScope): Promise<ContentGraph> =>
  getContentStore(scope).getPublished();

export const saveDraftContent = async (graph: ContentGraph, scope?: CmsWorkspaceScope) =>
  getContentStore(scope).saveDraft(timestampGraph(graph));

export const publishContent = async (
  graph: ContentGraph,
  options: PublishContentOptions = { scope: "all" },
  workspace?: CmsWorkspaceScope,
): Promise<PublishContentResult> => {
  const normalized = timestampGraph(graph);
  const store = getContentStore(workspace);
  const currentPublished = options.scope === "page" ? await store.getPublished() : null;
  const prepared = options.scope === "page"
    ? preparePagePublish(normalized, currentPublished!, options.pageId)
    : { draftGraph: normalized, publishedGraph: normalized };
  const publishIssues = validateContentGraph(prepared.publishedGraph);
  const errors = publishIssues.filter((issue) => issue.level === "error");

  if (errors.length > 0) {
    return { ok: false, graph: prepared.draftGraph, issues: publishIssues, warnings: [] };
  }

  const published = await store.publish(prepared.draftGraph, {
    publishedGraph: prepared.publishedGraph,
    ...(currentPublished
      ? { expectedPublishedUpdatedAt: currentPublished.updatedAt }
      : {}),
  });
  return {
    ok: true,
    graph: published.graph,
    issues: validateContentGraph(published.graph),
    warnings: published.warnings,
  };
};
