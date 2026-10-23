import type { ContentGraph } from "../../../../types";
import type { CmsWorkspaceScope } from "../workspaceTypes";
import { parseContentGraph } from "../schema";
import { ContentStoreConfigurationError, type ContentStore } from "./types";
import { missingContentErrorPrefix } from "./splitContent";
import { PublishedReleaseExpiredError, recoverPublishedRelease } from "./releaseExpiry";

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
    revalidateSeconds: 0, // Legacy setting retained in the type only; public reads refresh on publication.
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
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 404) {
        const error = await response.json().catch(() => null);
        if (error?.code === "CONTENT_NOT_PUBLISHED" || (typeof error?.error === "string" && error.error.startsWith(missingContentErrorPrefix))) {
          throw new Error(`${missingContentErrorPrefix} in remote published snapshot.`);
        }
      }
      throw new Error(`Blox published-content request failed (${response.status}).`);
    }
    return parseContentGraph(await response.json(), "Blox published content");
  }

  getDraft() {
    return this.read();
  }

  getPublished() {
    return this.read();
  }

  getPublishedReleaseForRender() {
    return this.getPublishedRelease(true);
  }

  async getPublishedRelease(requirePublicationProtocol = false) {
    const url = new URL("/api/public/release/", this.config.baseUrl);
    url.searchParams.set("tenant", this.config.tenantId);
    url.searchParams.set("site", this.config.siteId);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    // An older CMS can continue serving the existing whole-graph contract.
    if (response.status === 404 && !requirePublicationProtocol) return "";
    if (requirePublicationProtocol && response.status === 404) throw new ContentStoreConfigurationError("Upgrade the CMS publication sender before enabling publish-only website caching.");
    if (!response.ok) throw new Error(`Blox release request failed (${response.status}).`);
    const payload = await response.json();
    if (requirePublicationProtocol && (payload.publicationProtocol !== 1 || !payload.releaseId)) {
      throw new ContentStoreConfigurationError("Upgrade the CMS publication sender before enabling publish-only website caching.");
    }
    if (typeof payload.releaseId !== "string") throw new Error("Invalid Blox release response.");
    return payload.releaseId;
  }

  async getPublishedForPath(path: string, requestedRelease?: string) {
    const releaseId = requestedRelease || await this.getPublishedRelease();
    if (!releaseId) return { releaseId: "", graph: await this.read() };
    return recoverPublishedRelease(releaseId, async (pinned, recovering) => {
      const url = new URL("/api/public/content/", this.config.baseUrl);
      url.searchParams.set("tenant", this.config.tenantId);
      url.searchParams.set("site", this.config.siteId);
      url.searchParams.set("path", path);
      url.searchParams.set("release", pinned!);
      // A recovery bypasses all fetch caches; ordinary immutable reads stay cached.
      const response = await fetch(url, { cache: recovering ? "no-store" : "force-cache", signal: AbortSignal.timeout(10000) });
      if (response.status === 410) {
        const error = await response.json().catch(() => null);
        if (error?.code === "PUBLISHED_RELEASE_EXPIRED") throw new PublishedReleaseExpiredError();
      }
      if (!response.ok) throw new Error(`Blox page-content request failed (${response.status}).`);
      if (response.headers.get("x-blockforge-release") !== pinned) {
        throw new Error("Blox page response does not match its published release.");
      }
      return { releaseId: pinned!, graph: parseContentGraph(await response.json(), "Blox page content") };
    }, () => this.getPublishedRelease());
  }

  async getPublishedRouteIndex(requestedRelease?:string) {
    const releaseId=requestedRelease || await this.getPublishedRelease();
    if(!releaseId) return {releaseId:"",graph:await this.read()};
    return recoverPublishedRelease(releaseId,async(pinned,recovering)=>{
      const url=new URL("/api/public/content/",this.config.baseUrl);
      url.searchParams.set("tenant",this.config.tenantId);url.searchParams.set("site",this.config.siteId);
      url.searchParams.set("path","/");url.searchParams.set("release",pinned!);url.searchParams.set("view","route-index");
      const response=await fetch(url,{cache:recovering?"no-store":"force-cache",signal:AbortSignal.timeout(10000)});
      if(response.status===410) {
        const error=await response.json().catch(()=>null);if(error?.code==="PUBLISHED_RELEASE_EXPIRED") throw new PublishedReleaseExpiredError();
      }
      if(!response.ok) throw new Error(`Blox routing-index request failed (${response.status}).`);
      // An older CMS ignores the new view option. Its complete API remains the
      // compatibility source; a filtered home graph is never a routing index.
      if(response.headers.get("x-blox-route-index")!=="1") {
        const graph=await this.read();
        // The old complete API cannot pin a release. Verify its pointer after
        // reading; if it moved, the bounded recovery retries the current release.
        if(await this.getPublishedRelease()!==pinned) throw new PublishedReleaseExpiredError();
        return {releaseId:pinned!,graph};
      }
      if(response.headers.get("x-blockforge-release")!==pinned) throw new Error("Blox routing index does not match its published release.");
      return {releaseId:pinned!,graph:parseContentGraph(await response.json(),"Blox routing index")};
    },()=>this.getPublishedRelease());
  }

  async saveDraft(_graph: ContentGraph): Promise<ContentGraph> {
    throw new ContentStoreConfigurationError("The remote published-content store is read-only.");
  }

  async publish(_graph: ContentGraph): Promise<never> {
    throw new ContentStoreConfigurationError("The remote published-content store is read-only.");
  }
}
