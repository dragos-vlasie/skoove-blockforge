import { cache } from "react";
import { createHash } from "node:crypto";
import { publishedCacheTag } from "../lib/publishing/protocol";
import { ContentStoreConfigurationError } from "../lib/cms/storage/types";
import { unstable_cache } from "next/cache";
import type { ContentStore } from "../lib/cms/storage/types";
import type { CmsWorkspaceScope } from "../lib/cms/workspaceTypes";
import { getContentStore, readContentStoreMode } from "../lib/cms/storage";
import { createRemotePublishedContentStoreConfig } from "../lib/cms/storage/remotePublishedContentStore";
import { getPublishedContent, getPublishedContentForPath } from "../lib/cms/contentStore";
import { generatedClientExtensionViews } from "../extensions/generatedViews";
import { isMissingContentError } from "../lib/cms/storage/splitContent";
import { createPublicContentGraph } from "../lib/cms/publicApi";
import { recoverPublishedRelease } from "../lib/cms/storage/releaseExpiry";

// The release pointer is shared across routes and changes only on publication.
// A cold route must not independently ask the CMS whether the site changed.
const releaseForRender = (store: ContentStore, key: string[], scope: CmsWorkspaceScope) =>
  unstable_cache(async () => store.getPublishedReleaseForRender ? store.getPublishedReleaseForRender() : store.getPublishedRelease ? store.getPublishedRelease() : "",
    ["published-release-on-publish-v1", ...key],
    { revalidate: false, tags: [publishedCacheTag(scope)] })();

const assertRemotePublicationCaching=()=>{
  if(process.env.NODE_ENV==="production" && !process.env.BLOCKFORGE_REVALIDATION_SECRET) {
    throw new ContentStoreConfigurationError("Publish-only website caching requires BLOCKFORGE_REVALIDATION_SECRET. Configure the signed publication endpoint before deployment.");
  }
};

// Layout, metadata and page rendering share one snapshot per server request.
// Keep this separate from the uncached facade used by mutation/API handlers.
export const getPublishedContentForRender = cache(async (path = "/") => {
  const mode = readContentStoreMode();
  if (mode !== "remote" && mode !== "database") {
    if (Object.keys(generatedClientExtensionViews).length) return createPublicContentGraph(await getPublishedContent());
    return createPublicContentGraph((await getPublishedContentForPath(path)).graph);
  }
  if (mode === "remote") {
    const config = createRemotePublishedContentStoreConfig(process.env);
    assertRemotePublicationCaching();
    // Cache a validated, complete page read, not just the release pointer. A
    // failed pointer/document/schema read must leave the previous result intact.
    // Scope the persistent cache to the CMS origin AND client, never just a URL path.
    const store = getContentStore();
    const releaseId = await releaseForRender(store, ["remote", config.baseUrl, config.tenantId, config.siteId], config);
    return unstable_cache(async (routePath: string, pinnedRelease: string) => {
      // This installation already renders its Skoove extension through scoped delivery.
      // Preserve that deployed data contract while upgrading cache invalidation/recovery.
      const graph = (await store.getPublishedForPath!(routePath, pinnedRelease || undefined)).graph;
      return createPublicContentGraph(graph);
    }, ["published-render-on-publish-v3-archives", config.baseUrl, config.tenantId, config.siteId,
      Object.keys(generatedClientExtensionViews).sort().join(",")],
    { revalidate: false, tags: [publishedCacheTag(config)] })(path, releaseId);
  }
  const scope = { tenantId: process.env.CMS_TENANT_ID || "local", siteId: process.env.CMS_SITE_ID || "main" };
  const store = getContentStore();
  const source = createHash("sha256").update(process.env.CMS_DATABASE_URL || process.env.DATABASE_URL || "").digest("hex");
  const releaseId = await releaseForRender(store, [mode, source, scope.tenantId, scope.siteId], scope);
  return unstable_cache(async (routePath: string, pinnedRelease: string) => {
    if (Object.keys(generatedClientExtensionViews).length) return createPublicContentGraph(await getPublishedContent());
    const delivery = await recoverPublishedRelease(pinnedRelease || undefined,
      (release) => getPublishedContentForPath(routePath, undefined, release), () => store.getPublishedRelease!());
    return createPublicContentGraph(delivery.graph);
  }, ["published-render-on-publish-v3-archives", mode, source, scope.tenantId, scope.siteId,
    Object.keys(generatedClientExtensionViews).sort().join(",")],
  { revalidate: false, tags: [publishedCacheTag(scope)] })(path, releaseId);
});

export const getOptionalPublishedContentForRender = cache(async (path = "/") => {
 try { return await getPublishedContentForRender(path); } catch(error) { if(isMissingContentError(error)) return null; throw error; }
});

// Whole-site tools must never enumerate a paginated home response. Cache the
// complete metadata index separately, with the same publication-only tag.
export const getPublishedRouteIndexForRender=cache(async()=>{
  const mode=readContentStoreMode();
  if(mode!=="database" && mode!=="remote") return createPublicContentGraph(await getPublishedContent());
  if(mode==="remote") assertRemotePublicationCaching();
  const store=getContentStore();
  const scope={tenantId:process.env.CMS_TENANT_ID||"local",siteId:process.env.CMS_SITE_ID||"main"};
  const source=mode==="remote" ? createRemotePublishedContentStoreConfig(process.env).baseUrl
    : createHash("sha256").update(process.env.CMS_DATABASE_URL||process.env.DATABASE_URL||"").digest("hex");
  const releaseId=await releaseForRender(store,[mode,source,scope.tenantId,scope.siteId],scope);
  return unstable_cache(async(pinned:string)=>{
    if(!store.getPublishedRouteIndex) return createPublicContentGraph(await store.getPublished());
    const result=await recoverPublishedRelease(pinned||undefined,release=>store.getPublishedRouteIndex!(release),()=>store.getPublishedRelease!());
    return createPublicContentGraph(result.graph);
  },["published-routing-index-on-publish-v1",mode,source,scope.tenantId,scope.siteId],
    {revalidate:false,tags:[publishedCacheTag(scope)]})(releaseId);
});

export const getOptionalPublishedRouteIndexForRender=cache(async()=>{
  try{return await getPublishedRouteIndexForRender();}catch(error){if(isMissingContentError(error))return null;throw error;}
});
