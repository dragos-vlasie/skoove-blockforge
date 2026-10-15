import type { ContentGraph } from "../../../../types";
import type { CmsWorkspaceScope } from "../workspaceTypes";
import { parseContentGraph } from "../schema";
import { ContentStoreConfigurationError, type ContentStore } from "./types";
import { missingContentErrorPrefix } from "./splitContent";

type StoreEnv = Record<string, string | undefined>;

type RemotePublishedContentStoreConfig = CmsWorkspaceScope & {
  baseUrl: string;
  revalidateSeconds: number;
};

export const createRemotePublishedContentStoreConfig = (
  env: StoreEnv,
  scope?: CmsWorkspaceScope,
): RemotePublishedContentStoreConfig => {
  const baseUrl = env.BLOCKFORGE_CONTENT_API_URL || env.CMS_APP_URL || "";
  const tenantId = scope?.tenantId || env.CMS_TENANT_ID || "";
  const siteId = scope?.siteId || env.CMS_SITE_ID || "";
  if (!baseUrl) {
    throw new ContentStoreConfigurationError("CMS_CONTENT_STORE=remote requires BLOCKFORGE_CONTENT_API_URL.");
  }
  if (!tenantId || !siteId) {
    throw new ContentStoreConfigurationError("CMS_CONTENT_STORE=remote requires CMS_TENANT_ID and CMS_SITE_ID.");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    tenantId,
    siteId,
    revalidateSeconds: Math.max(0, Number(env.BLOCKFORGE_CONTENT_REVALIDATE_SECONDS || 60) || 0),
  };
};

export class RemotePublishedContentStore implements ContentStore {
  readonly mode = "remote" as const;

  constructor(private readonly config: RemotePublishedContentStoreConfig) {}

  private async read(): Promise<ContentGraph> {
    const url = new URL("/api/public/content/", this.config.baseUrl);
    url.searchParams.set("tenant", this.config.tenantId);
    url.searchParams.set("site", this.config.siteId);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      ...(this.config.revalidateSeconds > 0
        ? { next: { revalidate: this.config.revalidateSeconds } }
        : { cache: "no-store" as const }),
    });
    if (!response.ok) {
      if (response.status === 404) {
        const error = await response.json().catch(() => null);
        if (error?.code === "CONTENT_NOT_PUBLISHED" || (typeof error?.error === "string" && error.error.startsWith(missingContentErrorPrefix))) {
          throw new Error(`${missingContentErrorPrefix} in remote published snapshot.`);
        }
      }
      throw new Error(`BlockForge published-content request failed (${response.status}).`);
    }
    return parseContentGraph(await response.json(), "BlockForge published content");
  }

  getDraft() {
    return this.read();
  }

  getPublished() {
    return this.read();
  }

  async getPublishedRelease() {
    const url = new URL("/api/public/release/", this.config.baseUrl);
    url.searchParams.set("tenant", this.config.tenantId);
    url.searchParams.set("site", this.config.siteId);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    // An older CMS can continue serving the existing whole-graph contract.
    if (response.status === 404) return "";
    if (!response.ok) throw new Error(`BlockForge release request failed (${response.status}).`);
    const payload = await response.json();
    if (typeof payload.releaseId !== "string") throw new Error("Invalid BlockForge release response.");
    return payload.releaseId;
  }

  async getPublishedForPath(path: string, requestedRelease?: string) {
    const releaseId = requestedRelease || await this.getPublishedRelease();
    if (!releaseId) return { releaseId: "", graph: await this.read() };
    const url = new URL("/api/public/content/", this.config.baseUrl);
    url.searchParams.set("tenant", this.config.tenantId);
    url.searchParams.set("site", this.config.siteId);
    url.searchParams.set("path", path);
    url.searchParams.set("release", releaseId);
    // The URL identifies immutable published content. HTTP/CDN and Next's
    // persistent data cache can reuse it across app instances and cold starts.
    const response = await fetch(url, { cache: "force-cache", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`BlockForge page-content request failed (${response.status}).`);
    if (response.headers.get("x-blockforge-release") !== releaseId) {
      throw new Error("BlockForge page response does not match its published release.");
    }
    return { releaseId, graph: parseContentGraph(await response.json(), "BlockForge page content") };
  }

  async saveDraft(_graph: ContentGraph): Promise<ContentGraph> {
    throw new ContentStoreConfigurationError("The remote published-content store is read-only.");
  }

  async publish(_graph: ContentGraph): Promise<never> {
    throw new ContentStoreConfigurationError("The remote published-content store is read-only.");
  }
}
