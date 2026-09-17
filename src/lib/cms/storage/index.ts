import { createDatabaseContentStoreConfig, DatabaseContentStore } from "./databaseContentStore";
import { createGitHubContentStoreConfig, GitHubContentStore } from "./githubContentStore";
import { LocalFileContentStore } from "./localFileContentStore";
import { createRemotePublishedContentStoreConfig, RemotePublishedContentStore } from "./remotePublishedContentStore";
import { ContentStoreConfigurationError, type ContentStore, type ContentStoreMode } from "./types";
import { readRuntimeEnv } from "./env";
import type { CmsWorkspaceScope } from "../workspaceTypes";

type StoreEnv = Record<string, string | undefined>;

const cachedContentStores = new Map<string, ContentStore>();

export const readContentStoreMode = (env: StoreEnv = readRuntimeEnv()): ContentStoreMode => {
  const mode = (env.CMS_CONTENT_STORE || env.CMS_STORAGE || "local").toLowerCase();

  if (mode === "local" || mode === "github" || mode === "database" || mode === "remote") return mode;

  throw new ContentStoreConfigurationError(
    `Unsupported CMS content store "${mode}". Use CMS_CONTENT_STORE=local, CMS_CONTENT_STORE=github, CMS_CONTENT_STORE=database, or CMS_CONTENT_STORE=remote.`,
  );
};

export const createContentStore = (
  env: StoreEnv = readRuntimeEnv(),
  scope?: CmsWorkspaceScope,
): ContentStore => {
  const mode = readContentStoreMode(env);

  if (mode === "database") return new DatabaseContentStore(createDatabaseContentStoreConfig(env, scope));
  if (mode === "github") return new GitHubContentStore(createGitHubContentStoreConfig(env));
  if (mode === "remote") return new RemotePublishedContentStore(createRemotePublishedContentStoreConfig(env, scope));
  return new LocalFileContentStore();
};

const createContentStoreCacheKey = (
  env: StoreEnv = readRuntimeEnv(),
  scope?: CmsWorkspaceScope,
) => {
  const mode = readContentStoreMode(env);

  if (mode === "database") {
    return [
      mode,
      env.CMS_DATABASE_URL || env.DATABASE_URL || "",
      scope?.tenantId || env.CMS_TENANT_ID || "local",
      scope?.siteId || env.CMS_SITE_ID || "main",
      env.CMS_DATABASE_SSL || "",
      env.CMS_DATABASE_AUTO_MIGRATE || "",
    ].join("\0");
  }

  if (mode === "github") {
    return [
      mode,
      env.CMS_GITHUB_REPO || "",
      env.CMS_GITHUB_BRANCH || "",
      env.CMS_GITHUB_CONTENT_ROOT || "",
      env.CMS_GITHUB_API_URL || "",
      env.CMS_GITHUB_TOKEN || "",
    ].join("\0");
  }

  if (mode === "remote") {
    return [
      mode,
      env.BLOCKFORGE_CONTENT_API_URL || env.CMS_APP_URL || "",
      scope?.tenantId || env.CMS_TENANT_ID || "",
      scope?.siteId || env.CMS_SITE_ID || "",
      env.BLOCKFORGE_CONTENT_REVALIDATE_SECONDS || "",
    ].join("\0");
  }

  return mode;
};

export const getContentStore = (scope?: CmsWorkspaceScope) => {
  const env = readRuntimeEnv();
  const cacheKey = createContentStoreCacheKey(env, scope);

  if (!cachedContentStores.has(cacheKey)) {
    cachedContentStores.set(cacheKey, createContentStore(env, scope));
  }

  return cachedContentStores.get(cacheKey)!;
};

export const resetContentStoreForTests = () => {
  cachedContentStores.clear();
};

export type {
  ContentStore,
  ContentStoreMode,
  ContentStorePublishResult,
  PublishContentResult,
} from "./types";
