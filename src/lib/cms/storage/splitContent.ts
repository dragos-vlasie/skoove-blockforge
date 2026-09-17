import type {
  AssetMeta,
  BlueprintAssignment,
  Category,
  CollectionDefinition,
  CollectionEntry,
  ContentBlueprintDefinition,
  ContentGraph,
  NavigationMenu,
  PageContent,
  RedirectRule,
  SharedBlock,
} from "../../../../types";
import type { ContentManifest } from "../schema";
import { parseContentGraph, parseContentManifest } from "../schema";

type IdentifiedRecord =
  | PageContent
  | CollectionDefinition
  | CollectionEntry
  | Category
  | SharedBlock
  | NavigationMenu
  | AssetMeta
  | RedirectRule
  | ContentBlueprintDefinition
  | BlueprintAssignment;

export type JsonFileMap = Map<string, unknown>;

export type SplitContentFile = {
  path: string;
  value: unknown;
  content: string;
};

export const missingContentErrorPrefix = "No CMS content found";

export const isMissingContentError = (error: unknown) =>
  error instanceof Error && error.message.startsWith(missingContentErrorPrefix);

export const splitPaths = {
  meta: "_meta.json",
  site: "site.json",
  pages: "pages",
  collectionDefinitions: "collections",
  entries: "entries",
  categories: "categories",
  sharedBlocks: "shared-blocks",
  navigation: "navigation",
  assets: "assets",
  redirects: "redirects",
  customBlueprints: "blueprints",
  blueprintAssignments: "blueprint-assignments",
} as const;

const managedRecordFolders = [
  splitPaths.pages,
  splitPaths.collectionDefinitions,
  splitPaths.entries,
  splitPaths.categories,
  splitPaths.sharedBlocks,
  splitPaths.navigation,
  splitPaths.assets,
  splitPaths.redirects,
  splitPaths.customBlueprints,
  splitPaths.blueprintAssignments,
];

export const normalizeContentGraph = (graph: Partial<ContentGraph>): ContentGraph =>
  parseContentGraph(
    {
      version: 1,
      updatedAt: graph.updatedAt || new Date().toISOString(),
      site: graph.site,
      pages: graph.pages ?? [],
      collectionDefinitions: graph.collectionDefinitions ?? [],
      entries: graph.entries ?? [],
      categories: graph.categories ?? [],
      sharedBlocks: graph.sharedBlocks ?? [],
      navigation: graph.navigation ?? [],
      assets: graph.assets ?? [],
      redirects: graph.redirects ?? [],
      customBlueprints: graph.customBlueprints ?? [],
      blueprintAssignments: graph.blueprintAssignments ?? [],
    },
    "CMS content graph",
  );

export const stringifyJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export const stringifyContentGraph = (graph: ContentGraph) =>
  stringifyJson(normalizeContentGraph(graph));

export const safeFileName = (value: string) =>
  `${value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item"}.json`;

export const normalizeRelativeJsonPath = (path: string) =>
  path.replace(/\\/g, "/").replace(/^\/+/, "");

const hasSplitContent = (files: JsonFileMap) =>
  files.has(splitPaths.meta) || files.has(splitPaths.site);

const readRequiredJsonFile = <T>(files: JsonFileMap, path: string, sourceLabel: string): T => {
  if (!files.has(path)) {
    throw new Error(`Missing CMS content file ${path} in ${sourceLabel}.`);
  }

  return files.get(path) as T;
};

const readManifest = (files: JsonFileMap, sourceLabel: string): ContentManifest | null => {
  if (!files.has(splitPaths.meta)) return null;
  return parseContentManifest(files.get(splitPaths.meta), `${sourceLabel}/${splitPaths.meta}`);
};

const readRecordDirectory = <T extends IdentifiedRecord>(
  files: JsonFileMap,
  folder: string,
  orderedIds: string[] = [],
): T[] => {
  const recordsById = new Map<string, T>();
  const fallbackRecords: T[] = [];
  const folderPrefix = `${folder}/`;

  [...files.entries()]
    .filter(([path]) => {
      if (!path.startsWith(folderPrefix) || !path.endsWith(".json")) return false;
      return !path.slice(folderPrefix.length).includes("/");
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([, record]) => {
      const id = record && typeof record === "object" && "id" in record ? record.id : "";
      if (typeof id === "string" && id) {
        recordsById.set(id, record as T);
      } else {
        fallbackRecords.push(record as T);
      }
    });

  const orderedRecords = orderedIds
    .map((id) => recordsById.get(id))
    .filter((record): record is T => Boolean(record));
  const orderedSet = new Set(orderedRecords.map((record) => record.id));
  const unorderedRecords = [...recordsById.values()].filter((record) => !orderedSet.has(record.id));

  return [...orderedRecords, ...unorderedRecords, ...fallbackRecords];
};

const readSplitContent = (files: JsonFileMap, sourceLabel: string): ContentGraph => {
  const manifest = readManifest(files, sourceLabel);

  return normalizeContentGraph({
    version: 1,
    updatedAt: manifest?.updatedAt || new Date().toISOString(),
    site: readRequiredJsonFile(files, splitPaths.site, sourceLabel),
    pages: readRecordDirectory<PageContent>(files, splitPaths.pages, manifest?.order.pages),
    collectionDefinitions: readRecordDirectory<CollectionDefinition>(
      files,
      splitPaths.collectionDefinitions,
      manifest?.order.collectionDefinitions,
    ),
    entries: readRecordDirectory<CollectionEntry>(files, splitPaths.entries, manifest?.order.entries),
    categories: readRecordDirectory<Category>(files, splitPaths.categories, manifest?.order.categories),
    sharedBlocks: readRecordDirectory<SharedBlock>(files, splitPaths.sharedBlocks, manifest?.order.sharedBlocks),
    navigation: readRecordDirectory<NavigationMenu>(files, splitPaths.navigation, manifest?.order.navigation),
    assets: readRecordDirectory<AssetMeta>(files, splitPaths.assets, manifest?.order.assets),
    redirects: readRecordDirectory<RedirectRule>(files, splitPaths.redirects, manifest?.order.redirects),
    customBlueprints: readRecordDirectory<ContentBlueprintDefinition>(
      files,
      splitPaths.customBlueprints,
      manifest?.order.customBlueprints,
    ),
    blueprintAssignments: readRecordDirectory<BlueprintAssignment>(
      files,
      splitPaths.blueprintAssignments,
      manifest?.order.blueprintAssignments,
    ),
  });
};

export const readContentFromJsonFiles = (files: JsonFileMap, sourceLabel: string): ContentGraph => {
  if (hasSplitContent(files)) return readSplitContent(files, sourceLabel);

  if (!files.has("content.json")) {
    throw new Error(`${missingContentErrorPrefix} in ${sourceLabel}.`);
  }

  return normalizeContentGraph(files.get("content.json") as Partial<ContentGraph>);
};

export const createSplitContentFiles = (graph: ContentGraph): SplitContentFile[] => {
  const normalized = normalizeContentGraph(graph);
  const manifest: ContentManifest = {
    version: 1,
    updatedAt: normalized.updatedAt,
    order: {
      pages: normalized.pages.map((page) => page.id),
      collectionDefinitions: normalized.collectionDefinitions.map((definition) => definition.id),
      entries: normalized.entries.map((entry) => entry.id),
      categories: normalized.categories.map((category) => category.id),
      sharedBlocks: normalized.sharedBlocks.map((sharedBlock) => sharedBlock.id),
      navigation: normalized.navigation.map((menu) => menu.id),
      assets: normalized.assets.map((asset) => asset.id),
      redirects: normalized.redirects.map((redirect) => redirect.id),
      customBlueprints: (normalized.customBlueprints ?? []).map((blueprint) => blueprint.id),
      blueprintAssignments: (normalized.blueprintAssignments ?? []).map((assignment) => assignment.id),
    },
  };

  const values: Array<{ path: string; value: unknown }> = [
    { path: splitPaths.meta, value: manifest },
    { path: splitPaths.site, value: normalized.site },
    ...normalized.pages.map((page) => ({ path: `${splitPaths.pages}/${safeFileName(page.id)}`, value: page })),
    ...normalized.collectionDefinitions.map((definition) => ({
      path: `${splitPaths.collectionDefinitions}/${safeFileName(definition.id)}`,
      value: definition,
    })),
    ...normalized.entries.map((entry) => ({ path: `${splitPaths.entries}/${safeFileName(entry.id)}`, value: entry })),
    ...normalized.categories.map((category) => ({
      path: `${splitPaths.categories}/${safeFileName(category.id)}`,
      value: category,
    })),
    ...normalized.sharedBlocks.map((sharedBlock) => ({
      path: `${splitPaths.sharedBlocks}/${safeFileName(sharedBlock.id)}`,
      value: sharedBlock,
    })),
    ...normalized.navigation.map((menu) => ({
      path: `${splitPaths.navigation}/${safeFileName(menu.id)}`,
      value: menu,
    })),
    ...normalized.assets.map((asset) => ({ path: `${splitPaths.assets}/${safeFileName(asset.id)}`, value: asset })),
    ...normalized.redirects.map((redirect) => ({
      path: `${splitPaths.redirects}/${safeFileName(redirect.id)}`,
      value: redirect,
    })),
    ...(normalized.customBlueprints ?? []).map((blueprint) => ({
      path: `${splitPaths.customBlueprints}/${safeFileName(blueprint.id)}`,
      value: blueprint,
    })),
    ...(normalized.blueprintAssignments ?? []).map((assignment) => ({
      path: `${splitPaths.blueprintAssignments}/${safeFileName(assignment.id)}`,
      value: assignment,
    })),
  ];

  return values.map((file) => ({
    ...file,
    content: stringifyJson(file.value),
  }));
};

export const isManagedSplitJsonPath = (path: string) => {
  const normalized = normalizeRelativeJsonPath(path);

  if (normalized === splitPaths.meta || normalized === splitPaths.site) return true;

  return managedRecordFolders.some((folder) => {
    const folderPrefix = `${folder}/`;
    if (!normalized.startsWith(folderPrefix) || !normalized.endsWith(".json")) return false;
    return !normalized.slice(folderPrefix.length).includes("/");
  });
};
