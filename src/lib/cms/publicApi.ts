import type { AssetMeta, ContentGraph, NavigationItem } from "../../../types";
import { normalizeContentGraph } from "./storage/splitContent";
import type { CmsWorkspaceScope } from "./workspaceTypes";

const workspaceIdPattern = /^[a-z0-9](?:[a-z0-9-]{0,62})$/;

export const parsePublicWorkspaceScope = (url: string): CmsWorkspaceScope => {
  const searchParams = new URL(url).searchParams;
  const tenantId = searchParams.get("tenant")?.trim().toLowerCase() || "";
  const siteId = searchParams.get("site")?.trim().toLowerCase() || "";

  if (!workspaceIdPattern.test(tenantId) || !workspaceIdPattern.test(siteId)) {
    throw new Error("A valid tenant and site are required.");
  }

  return { tenantId, siteId };
};
const collectStringValues = (value: unknown, values = new Set<string>()) => {
  if (typeof value === "string") {
    values.add(value);
    return values;
  }
  if (!value || typeof value !== "object") return values;
  Object.values(value).forEach((nestedValue) => collectStringValues(nestedValue, values));
  return values;
};

const publicAsset = (asset: AssetMeta): AssetMeta => {
  const { storagePath: _storagePath, bucket: _bucket, ...safeAsset } = asset;
  return safeAsset;
};

const filterNavigationItems = (
  items: NavigationItem[],
  publicIds: Set<string>,
): NavigationItem[] => items.flatMap((item) => {
  if (item.targetType !== "url" && item.targetId && !publicIds.has(item.targetId)) return [];
  return [{ ...item, children: filterNavigationItems(item.children || [], publicIds) }];
});

export const createPublicContentGraph = (graph: ContentGraph): ContentGraph => {
  const pages = graph.pages.filter((page) => page.status === "published");
  const entries = graph.entries.filter((entry) => entry.status === "published");
  const sharedBlocks = graph.sharedBlocks.filter((block) => block.status === "published");
  const publicIds = new Set([
    ...pages.map((page) => page.id),
    ...entries.map((entry) => entry.id),
    ...sharedBlocks.map((block) => block.id),
    ...graph.collectionDefinitions.map((definition) => definition.id),
    ...graph.categories.map((category) => category.id),
  ]);
  const navigation = graph.navigation.map((menu) => ({
    ...menu,
    items: filterNavigationItems(menu.items, publicIds),
  }));
  const publicGraphWithoutAssets = {
    ...graph,
    pages,
    entries,
    sharedBlocks,
    navigation,
    assets: [],
    customBlueprints: [],
    blueprintAssignments: [],
  };
  const referencedValues = collectStringValues(publicGraphWithoutAssets);
  const assets = graph.assets
    .filter((asset) => referencedValues.has(asset.id) || referencedValues.has(asset.url))
    .map(publicAsset);

  return normalizeContentGraph({ ...publicGraphWithoutAssets, assets });
};
