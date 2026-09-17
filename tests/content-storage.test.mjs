import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const contentStoreSource = readSource("../src/lib/cms/contentStore.ts");
const storageIndexSource = readSource("../src/lib/cms/storage/index.ts");
const storageEnvSource = readSource("../src/lib/cms/storage/env.ts");
const storageTypesSource = readSource("../src/lib/cms/storage/types.ts");
const localStoreSource = readSource("../src/lib/cms/storage/localFileContentStore.ts");
const githubStoreSource = readSource("../src/lib/cms/storage/githubContentStore.ts");
const databaseStoreSource = readSource("../src/lib/cms/storage/databaseContentStore.ts");
const cmsContentRouteSource = readSource("../src/pages/api/cms/content.ts");
const cmsPublishRouteSource = readSource("../src/pages/api/cms/publish.ts");
const mediaSource = readSource("../src/lib/cms/media.ts");
const envExampleSource = readSource("../.env.example");
const readmeSource = readSource("../README.md");
const packageSource = readSource("../package.json");
const databaseSchemaSource = readSource("../database/cms-content-store.sql");

test("content store exposes async storage adapter contract", () => {
  assert.match(storageTypesSource, /interface ContentStore/);
  assert.match(storageTypesSource, /getDraft\(\): Promise<ContentGraph>/);
  assert.match(storageTypesSource, /saveDraft\(graph: ContentGraph\): Promise<ContentGraph>/);
  assert.match(storageTypesSource, /getPublished\(\): Promise<ContentGraph>/);
  assert.match(storageTypesSource, /publish\(graph: ContentGraph\): Promise<ContentGraph>/);
});

test("content store facade delegates through selected backend", () => {
  assert.match(contentStoreSource, /getContentStore\(\)\.getDraft\(\)/);
  assert.match(contentStoreSource, /getContentStore\(\)\.saveDraft/);
  assert.match(contentStoreSource, /getContentStore\(\)\.getPublished\(\)/);
  assert.match(contentStoreSource, /getContentStore\(\)\.publish/);
  assert.match(contentStoreSource, /validateContentGraph/);
});

test("storage mode is selected by environment and fails clearly for unsupported modes", () => {
  assert.match(storageIndexSource, /CMS_CONTENT_STORE/);
  assert.match(storageIndexSource, /CMS_STORAGE/);
  assert.match(storageIndexSource, /readRuntimeEnv/);
  assert.match(storageEnvSource, /import\.meta/);
  assert.match(storageEnvSource, /process\.env/);
  assert.match(storageIndexSource, /mode === "github"/);
  assert.match(storageIndexSource, /mode === "database"/);
  assert.match(storageIndexSource, /mode === "local"/);
  assert.match(storageIndexSource, /Unsupported CMS content store/);
});

test("local, github, and database stores implement the same content format", () => {
  assert.match(localStoreSource, /createSplitContentFiles/);
  assert.match(localStoreSource, /readContentFromJsonFiles/);
  assert.match(githubStoreSource, /createSplitContentFiles/);
  assert.match(githubStoreSource, /readContentFromJsonFiles/);
  assert.match(databaseStoreSource, /normalizeContentGraph/);
});

test("github store is a real GitHub commit backend", () => {
  assert.match(githubStoreSource, /CMS_GITHUB_TOKEN/);
  assert.match(githubStoreSource, /CMS_GITHUB_REPO/);
  assert.match(githubStoreSource, /CMS_GITHUB_BRANCH/);
  assert.match(githubStoreSource, /normalizeGitHubRepo/);
  assert.match(githubStoreSource, /GitHub repository URL/);
  assert.match(githubStoreSource, /createCommitMessage/);
  assert.match(githubStoreSource, /Changed files:/);
  assert.match(githubStoreSource, /gitBlobSha/);
  assert.match(githubStoreSource, /commitSnapshots/);
  assert.match(githubStoreSource, /\/git\/trees/);
  assert.match(githubStoreSource, /\/git\/commits/);
  assert.match(githubStoreSource, /\/git\/refs\/heads/);
  assert.match(githubStoreSource, /force: false/);
});

test("cms api routes use async content store facade", () => {
  assert.match(cmsContentRouteSource, /await getDraftContent\(\)/);
  assert.match(cmsContentRouteSource, /await saveDraftContent/);
  assert.match(cmsPublishRouteSource, /await publishContent\(body\.graph \?\? await getDraftContent\(\)\)/);
});

test("database store stores draft and published snapshots in Postgres jsonb", () => {
  assert.equal(existsSync(new URL("../src/lib/cms/storage/databaseContentStore.ts", import.meta.url)), true);
  assert.match(packageSource, /"postgres"/);
  assert.match(databaseStoreSource, /from "postgres"/);
  assert.match(databaseStoreSource, /prepare: false/);
  assert.match(databaseStoreSource, /max: 1/);
  assert.match(databaseStoreSource, /CMS_DATABASE_URL/);
  assert.match(databaseStoreSource, /DATABASE_URL/);
  assert.match(databaseStoreSource, /CMS_TENANT_ID/);
  assert.match(databaseStoreSource, /CMS_SITE_ID/);
  assert.match(databaseStoreSource, /CMS_DATABASE_SSL/);
  assert.match(databaseStoreSource, /CMS_DATABASE_AUTO_MIGRATE/);
  assert.match(databaseStoreSource, /CMS_PUBLISH_WEBHOOK_URL/);
  assert.match(databaseStoreSource, /NETLIFY_BUILD_HOOK_URL/);
  assert.match(databaseStoreSource, /cms_content_snapshots/);
  assert.match(databaseStoreSource, /cms_content_versions/);
  assert.match(databaseStoreSource, /create table if not exists/);
  assert.match(databaseStoreSource, /on conflict \(tenant_id, site_id, status\)/);
  assert.match(databaseStoreSource, /returning version/);
  assert.match(databaseStoreSource, /::jsonb/);
});

test("database storage has deployable schema and documented environment", () => {
  assert.equal(existsSync(new URL("../database/cms-content-store.sql", import.meta.url)), true);
  assert.match(databaseSchemaSource, /create table if not exists cms_tenants/);
  assert.match(databaseSchemaSource, /create table if not exists cms_sites/);
  assert.match(databaseSchemaSource, /create table if not exists cms_content_snapshots/);
  assert.match(databaseSchemaSource, /graph_json jsonb not null/);
  assert.match(databaseSchemaSource, /create table if not exists cms_content_versions/);
  assert.match(databaseSchemaSource, /cms_content_versions_site_idx/);

  assert.match(envExampleSource, /CMS_CONTENT_STORE=local/);
  assert.match(envExampleSource, /CMS_DATABASE_URL=/);
  assert.match(envExampleSource, /CMS_TENANT_ID=/);
  assert.match(envExampleSource, /CMS_SITE_ID=/);
  assert.match(envExampleSource, /CMS_DATABASE_SSL=/);
  assert.match(envExampleSource, /CMS_DATABASE_AUTO_MIGRATE=true/);
  assert.match(envExampleSource, /CMS_PUBLISH_WEBHOOK_URL=/);

  assert.match(readmeSource, /CMS_CONTENT_STORE=database/);
  assert.match(readmeSource, /cms_content_snapshots/);
  assert.match(readmeSource, /cms_content_versions/);
  assert.match(readmeSource, /Netlify build hook/);
});

test("database storage does not force GitHub media uploads", () => {
  assert.match(mediaSource, /const fallbackMediaStore = contentStoreMode === "github" \? "github" : "local"/);
  assert.match(mediaSource, /CMS_MEDIA_STORE \|\| fallbackMediaStore/);
});
