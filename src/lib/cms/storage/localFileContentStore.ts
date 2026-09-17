import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ContentGraph } from "../../../../types";
import type { ContentStore } from "./types";
import {
  createSplitContentFiles,
  isManagedSplitJsonPath,
  isMissingContentError,
  normalizeContentGraph,
  normalizeRelativeJsonPath,
  readContentFromJsonFiles,
  splitPaths,
  stringifyJson,
  type JsonFileMap,
} from "./splitContent";

const localContentRoot = () => {
  const configuredRoot = process.env.CMS_LOCAL_CONTENT_ROOT;
  if (configuredRoot) return resolve(configuredRoot);

  const workingDirectory = process.cwd();
  const directContent = resolve(workingDirectory, "content");
  if (existsSync(directContent)) return directContent;

  const workspaceContent = resolve(workingDirectory, "../..", "content");
  return existsSync(workspaceContent) ? workspaceContent : directContent;
};

export const draftContentDirectory = resolve(localContentRoot(), "draft");
export const publishedContentDirectory = resolve(localContentRoot(), "published");

const readJsonFile = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

const readJsonFilesFromDirectory = (directory: string): JsonFileMap => {
  const files: JsonFileMap = new Map();

  if (!existsSync(directory)) return files;

  const walk = (absoluteDirectory: string, relativeDirectory = "") => {
    readdirSync(absoluteDirectory, { withFileTypes: true }).forEach((entry) => {
      const absolutePath = resolve(absoluteDirectory, entry.name);
      const relativePath = normalizeRelativeJsonPath(
        relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name,
      );

      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
        return;
      }

      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.set(relativePath, readJsonFile(absolutePath));
      }
    });
  };

  walk(directory);
  return files;
};

const readContent = (directory: string): ContentGraph =>
  readContentFromJsonFiles(readJsonFilesFromDirectory(directory), directory);

const writeJsonFile = async (path: string, value: unknown) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringifyJson(value), "utf8");
};

const deleteStaleManagedJsonFiles = async (directory: string, expectedPaths: Set<string>) => {
  await Promise.all(
    [
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
    ].map(async (folder) => {
      const recordsPath = resolve(directory, folder);
      if (!existsSync(recordsPath)) return;

      await Promise.all(
        readdirSync(recordsPath)
          .filter((fileName) => fileName.endsWith(".json"))
          .map((fileName) => `${folder}/${fileName}`)
          .filter((relativePath) => isManagedSplitJsonPath(relativePath) && !expectedPaths.has(relativePath))
          .map((relativePath) => rm(resolve(directory, relativePath), { force: true })),
      );
    }),
  );
};

const writeSplitContent = async (directory: string, graph: ContentGraph) => {
  await mkdir(directory, { recursive: true });

  const files = createSplitContentFiles(graph);
  const expectedPaths = new Set(files.map((file) => file.path));

  await Promise.all(
    files.map((file) => writeJsonFile(resolve(directory, file.path), file.value)),
  );
  await deleteStaleManagedJsonFiles(directory, expectedPaths);
};

export class LocalFileContentStore implements ContentStore {
  readonly mode = "local" as const;

  async getDraft() {
    try {
      return readContent(draftContentDirectory);
    } catch (error) {
      if (!isMissingContentError(error)) throw error;
      return readContent(publishedContentDirectory);
    }
  }

  async saveDraft(graph: ContentGraph) {
    const nextGraph = normalizeContentGraph({
      ...graph,
      updatedAt: new Date().toISOString(),
    });

    await writeSplitContent(draftContentDirectory, nextGraph);
    return nextGraph;
  }

  async getPublished() {
    try {
      return readContent(publishedContentDirectory);
    } catch (error) {
      if (!isMissingContentError(error)) throw error;
      return this.getDraft();
    }
  }

  async publish(
    graph: ContentGraph,
    options: { publishedGraph?: ContentGraph; expectedPublishedUpdatedAt?: string } = {},
  ) {
    if (options.expectedPublishedUpdatedAt) {
      const currentPublished = await this.getPublished();
      if (currentPublished.updatedAt !== options.expectedPublishedUpdatedAt) {
        throw new Error("Published content changed while this page was publishing. Retry the publish.");
      }
    }

    const nextGraph = normalizeContentGraph({
      ...graph,
      updatedAt: new Date().toISOString(),
    });
    const publishedGraph = normalizeContentGraph({
      ...(options.publishedGraph ?? nextGraph),
      updatedAt: nextGraph.updatedAt,
    });

    await Promise.all([
      writeSplitContent(draftContentDirectory, nextGraph),
      writeSplitContent(publishedContentDirectory, publishedGraph),
    ]);
    return { graph: nextGraph, warnings: [] };
  }
}
