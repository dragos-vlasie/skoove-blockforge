import { createHash } from "node:crypto";
import type { ContentGraph } from "../../../../types";
import {
  createSplitContentFiles,
  isManagedSplitJsonPath,
  isMissingContentError,
  normalizeContentGraph,
  normalizeRelativeJsonPath,
  readContentFromJsonFiles,
  type JsonFileMap,
} from "./splitContent";
import { readRuntimeEnv } from "./env";
import { ContentStoreConfigurationError, type ContentStore } from "./types";

export type GitHubContentStoreConfig = {
  token: string;
  repo: string;
  branch: string;
  contentRoot: string;
  apiBaseUrl: string;
  author?: {
    name: string;
    email: string;
  };
};

type GitHubEnv = Record<string, string | undefined>;

type GitRefResponse = {
  object: {
    sha: string;
  };
};

type GitCommitResponse = {
  sha: string;
  tree: {
    sha: string;
  };
};

type GitTreeEntry = {
  path: string;
  mode?: string;
  type: "blob" | "tree" | "commit";
  sha?: string;
};

type GitTreeResponse = {
  sha: string;
  tree: GitTreeEntry[];
  truncated?: boolean;
};

type GitBlobResponse = {
  sha: string;
  content: string;
  encoding: string;
};

type GitCreateBlobResponse = {
  sha: string;
};

type GitTreeMutation = {
  path: string;
  mode: "100644";
  type: "blob";
  sha: string | null;
};

type GitCreateTreeResponse = {
  sha: string;
};

type GitCreateCommitResponse = {
  sha: string;
};

type ContentSnapshotName = "draft" | "published";

type ContentSnapshotUpdate = {
  snapshot: ContentSnapshotName;
  graph: ContentGraph;
};

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");
const joinGitPath = (...parts: string[]) => parts.map(trimSlashes).filter(Boolean).join("/");
const encodeRefPath = (value: string) => value.split("/").map(encodeURIComponent).join("/");
const isPresent = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

const readEnv = (env: GitHubEnv, primary: string, fallback?: string) =>
  env[primary] || (fallback ? env[fallback] : undefined);

const normalizeGitHubRepo = (value: string) => {
  const trimmed = value.trim();
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];

  try {
    const url = new URL(trimmed);
    if (url.hostname === "github.com") {
      return trimSlashes(url.pathname).replace(/\.git$/, "");
    }
  } catch {
    // Keep handling owner/repo below.
  }

  return trimSlashes(trimmed).replace(/\.git$/, "");
};

const isOwnerRepo = (value: string) =>
  value.split("/").length === 2 && value.split("/").every((part) => part.trim().length > 0);

const gitBlobSha = (content: string) =>
  createHash("sha1")
    .update(`blob ${Buffer.byteLength(content)}\0`)
    .update(content)
    .digest("hex");

const isMetadataPath = (path: string) =>
  path.endsWith("/_meta.json") || path.endsWith("/site.json");

const snapshotRank = (path: string) => {
  if (path.includes("/published/")) return 0;
  if (path.includes("/draft/")) return 1;
  return 2;
};

const sortChangedPaths = (paths: string[]) =>
  [...new Set(paths)].sort((left, right) => {
    const leftMetadata = isMetadataPath(left);
    const rightMetadata = isMetadataPath(right);
    if (leftMetadata !== rightMetadata) return leftMetadata ? 1 : -1;
    const snapshotSort = snapshotRank(left) - snapshotRank(right);
    if (snapshotSort !== 0) return snapshotSort;
    return left.localeCompare(right);
  });

const createCommitMessage = (baseMessage: string, changedPaths: string[]) => {
  const paths = sortChangedPaths(changedPaths);
  if (paths.length === 0) return baseMessage;

  const [firstPath, ...remainingPaths] = paths;
  const title = `${baseMessage}: ${firstPath}${remainingPaths.length > 0 ? ` + ${remainingPaths.length} more` : ""}`;

  return `${title}\n\nChanged files:\n${paths.map((path) => `- ${path}`).join("\n")}`;
};

export const createGitHubContentStoreConfig = (env: GitHubEnv = readRuntimeEnv()): GitHubContentStoreConfig => {
  const token = readEnv(env, "CMS_GITHUB_TOKEN", "GITHUB_TOKEN");
  const repo = normalizeGitHubRepo(readEnv(env, "CMS_GITHUB_REPO", "GITHUB_REPOSITORY") || "");
  const branch = readEnv(env, "CMS_GITHUB_BRANCH", "GITHUB_BRANCH") || env.BRANCH || "main";
  const contentRoot = env.CMS_GITHUB_CONTENT_ROOT || "content";
  const apiBaseUrl = env.CMS_GITHUB_API_URL || "https://api.github.com";
  const authorName = env.CMS_GITHUB_COMMIT_AUTHOR_NAME;
  const authorEmail = env.CMS_GITHUB_COMMIT_AUTHOR_EMAIL;

  if (!token) {
    throw new ContentStoreConfigurationError("CMS_CONTENT_STORE=github requires CMS_GITHUB_TOKEN.");
  }

  if (!repo) {
    throw new ContentStoreConfigurationError("CMS_CONTENT_STORE=github requires CMS_GITHUB_REPO.");
  }

  if (!isOwnerRepo(repo)) {
    throw new ContentStoreConfigurationError("CMS_GITHUB_REPO must use owner/repo format or a GitHub repository URL.");
  }

  return {
    token,
    repo,
    branch: branch.replace(/^refs\/heads\//, ""),
    contentRoot: trimSlashes(contentRoot) || "content",
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    author: authorName && authorEmail ? { name: authorName, email: authorEmail } : undefined,
  };
};

const decodeGitBlob = (blob: GitBlobResponse) => {
  if (blob.encoding === "base64") {
    return Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf8");
  }

  if (blob.encoding === "utf-8" || blob.encoding === "utf8") {
    return blob.content;
  }

  throw new Error(`Unsupported GitHub blob encoding: ${blob.encoding}.`);
};

export class GitHubContentStore implements ContentStore {
  readonly mode = "github" as const;

  private readonly token: string;
  private readonly repo: string;
  private readonly branch: string;
  private readonly contentRoot: string;
  private readonly apiBaseUrl: string;
  private readonly author?: GitHubContentStoreConfig["author"];

  constructor(config: GitHubContentStoreConfig = createGitHubContentStoreConfig()) {
    this.token = config.token;
    this.repo = config.repo;
    this.branch = config.branch;
    this.contentRoot = config.contentRoot;
    this.apiBaseUrl = config.apiBaseUrl;
    this.author = config.author;
  }

  async getDraft() {
    try {
      return await this.readSnapshot("draft");
    } catch (error) {
      if (!isMissingContentError(error)) throw error;
      return this.readSnapshot("published");
    }
  }

  async saveDraft(graph: ContentGraph) {
    const nextGraph = normalizeContentGraph({
      ...graph,
      updatedAt: new Date().toISOString(),
    });

    await this.commitSnapshots([{ snapshot: "draft", graph: nextGraph }], "Update CMS draft content");
    return nextGraph;
  }

  async getPublished() {
    try {
      return await this.readSnapshot("published");
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

    await this.commitSnapshots(
      [
        { snapshot: "draft", graph: nextGraph },
        { snapshot: "published", graph: publishedGraph },
      ],
      "Publish CMS content",
    );
    return { graph: nextGraph, warnings: [] };
  }

  private get getRefPath() {
    return `/git/ref/heads/${encodeRefPath(this.branch)}`;
  }

  private get updateRefPath() {
    return `/git/refs/heads/${encodeRefPath(this.branch)}`;
  }

  private snapshotRoot(snapshot: ContentSnapshotName) {
    return joinGitPath(this.contentRoot, snapshot);
  }

  private async request<T>(
    path: string,
    init: Omit<RequestInit, "body"> & { body?: unknown } = {},
  ): Promise<T> {
    const { body, headers, ...rest } = init;
    const response = await fetch(`${this.apiBaseUrl}/repos/${this.repo}${path}`, {
      ...rest,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let message = text;

      try {
        const payload = JSON.parse(text);
        message = payload.message || text;
      } catch {
        // Keep the plain response text.
      }

      throw new Error(
        `GitHub content store request failed (${response.status} ${response.statusText})${message ? `: ${message}` : ""}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private async getBaseGitState() {
    const ref = await this.request<GitRefResponse>(this.getRefPath);
    const commit = await this.request<GitCommitResponse>(`/git/commits/${ref.object.sha}`);
    const tree = await this.request<GitTreeResponse>(`/git/trees/${commit.tree.sha}?recursive=1`);

    if (tree.truncated) {
      throw new Error("GitHub content tree is too large to read recursively.");
    }

    return {
      commitSha: commit.sha,
      treeSha: commit.tree.sha,
      treeEntries: tree.tree,
    };
  }

  private async readSnapshot(snapshot: ContentSnapshotName) {
    const { treeEntries } = await this.getBaseGitState();
    const root = this.snapshotRoot(snapshot);
    const prefix = `${root}/`;
    const jsonEntries = treeEntries.filter(
      (entry) => entry.type === "blob" && entry.sha && entry.path.startsWith(prefix) && entry.path.endsWith(".json"),
    );

    const fileEntries = await Promise.all(
      jsonEntries.map(async (entry) => {
        const blob = await this.request<GitBlobResponse>(`/git/blobs/${entry.sha}`);
        const raw = decodeGitBlob(blob);
        const relativePath = normalizeRelativeJsonPath(entry.path.slice(prefix.length));

        try {
          return [relativePath, JSON.parse(raw)] as const;
        } catch (error) {
          throw new Error(
            `Invalid JSON in GitHub CMS content file ${entry.path}: ${error instanceof Error ? error.message : "parse failed"}`,
          );
        }
      }),
    );

    return readContentFromJsonFiles(new Map(fileEntries) as JsonFileMap, `GitHub ${this.repo}:${this.branch}/${root}`);
  }

  private async commitSnapshots(updates: ContentSnapshotUpdate[], message: string) {
    const { commitSha, treeSha, treeEntries } = await this.getBaseGitState();
    const snapshotRoots = updates.map(({ snapshot }) => this.snapshotRoot(snapshot));
    const files = updates.flatMap(({ snapshot, graph }) => {
      const root = this.snapshotRoot(snapshot);

      return createSplitContentFiles(graph).map((file) => ({
        ...file,
        path: joinGitPath(root, file.path),
        root,
      }));
    });
    const expectedPathsByRoot = new Map(
      snapshotRoots.map((root) => [
        root,
        new Set(files.filter((file) => file.root === root).map((file) => file.path)),
      ]),
    );
    const currentFileShaByPath = new Map(
      treeEntries
        .filter((entry) => entry.type === "blob" && entry.sha && snapshotRoots.some((root) => entry.path.startsWith(`${root}/`)) && entry.path.endsWith(".json"))
        .map((entry) => [entry.path, entry.sha as string]),
    );

    const fileTreeItems = await Promise.all(
      files.map(async (file): Promise<GitTreeMutation | null> => {
        const nextSha = gitBlobSha(file.content);
        if (currentFileShaByPath.get(file.path) === nextSha) return null;

        const blob = await this.request<GitCreateBlobResponse>("/git/blobs", {
          method: "POST",
          body: {
            content: file.content,
            encoding: "utf-8",
          },
        });

        return {
          path: file.path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        };
      }),
    ).then((items) => items.filter(isPresent));

    const staleTreeEntries = treeEntries
      .filter((entry) => entry.type === "blob" && snapshotRoots.some((root) => entry.path.startsWith(`${root}/`)) && entry.path.endsWith(".json"))
      .map((entry) => ({
        absolutePath: entry.path,
        root: snapshotRoots.find((root) => entry.path.startsWith(`${root}/`)) ?? "",
      }))
      .map((entry) => ({
        ...entry,
        relativePath: normalizeRelativeJsonPath(entry.absolutePath.slice(`${entry.root}/`.length)),
      }))
      .filter(({ absolutePath, relativePath, root }) => isManagedSplitJsonPath(relativePath) && !expectedPathsByRoot.get(root)?.has(absolutePath));

    const deleteTreeItems = staleTreeEntries.map(({ absolutePath }): GitTreeMutation => ({
      path: absolutePath,
      mode: "100644",
      type: "blob",
      sha: null,
    }));
    const changedPaths = [
      ...fileTreeItems.map((item) => item.path),
      ...staleTreeEntries.map((entry) => entry.absolutePath),
    ];

    if (changedPaths.length === 0) return;

    const tree = await this.request<GitCreateTreeResponse>("/git/trees", {
      method: "POST",
      body: {
        base_tree: treeSha,
        tree: [...fileTreeItems, ...deleteTreeItems],
      },
    });

    const commit = await this.request<GitCreateCommitResponse>("/git/commits", {
      method: "POST",
      body: {
        message: createCommitMessage(message, changedPaths),
        tree: tree.sha,
        parents: [commitSha],
        ...(this.author
          ? {
              author: {
                ...this.author,
                date: new Date().toISOString(),
              },
            }
          : {}),
      },
    });

    await this.request(this.updateRefPath, {
      method: "PATCH",
      body: {
        sha: commit.sha,
        force: false,
      },
    });
  }
}
