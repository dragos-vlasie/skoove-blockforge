import type { ContentGraph } from "../../../../types";
import type { CmsWorkspaceScope } from "../workspaceTypes";
import { parseContentGraph } from "../schema";
import { ContentStoreConfigurationError, type ContentStore } from "./types";

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
      ...(this.config.revalidateSeconds > 0
        ? { next: { revalidate: this.config.revalidateSeconds } }
        : { cache: "no-store" as const }),
    });
    if (!response.ok) {
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

  async saveDraft(_graph: ContentGraph): Promise<ContentGraph> {
    throw new ContentStoreConfigurationError("The remote published-content store is read-only.");
  }

  async publish(_graph: ContentGraph): Promise<never> {
    throw new ContentStoreConfigurationError("The remote published-content store is read-only.");
  }
}
