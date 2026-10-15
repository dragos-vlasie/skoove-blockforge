import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getContentStore, readContentStoreMode } from "../lib/cms/storage";
import { createRemotePublishedContentStoreConfig } from "../lib/cms/storage/remotePublishedContentStore";
import { getPublishedContentForPath } from "../lib/cms/contentStore";
import { isMissingContentError } from "../lib/cms/storage/splitContent";
import { createPublicContentGraph } from "../lib/cms/publicApi";

// Layout, metadata and page rendering share one snapshot per server request.
// Keep this separate from the uncached facade used by mutation/API handlers.
export const getPublishedContentForRender = cache(async (path = "/") => {
  if (readContentStoreMode() === "remote") {
    const config = createRemotePublishedContentStoreConfig(process.env);
    // Cache a validated, complete page read, not just the release pointer. A
    // failed pointer/document/schema read must leave the previous result intact.
    // Scope the persistent cache to the CMS origin AND client, never just a URL path.
    return unstable_cache(async (routePath: string) => {
      const store = getContentStore();
      // The existing Skoove hero uses block props only; retain the deployed
      // scoped-delivery contract instead of downloading the full content graph.
      const graph = (await store.getPublishedForPath!(routePath)).graph;
      return createPublicContentGraph(graph);
    }, ["published-render-v1", config.baseUrl, config.tenantId, config.siteId,
      String(config.revalidateSeconds)],
    { revalidate: Math.max(1, config.revalidateSeconds) })(path);
  }
  return createPublicContentGraph((await getPublishedContentForPath(path)).graph);
});

export const getOptionalPublishedContentForRender = cache(async (path = "/") => {
 try { return await getPublishedContentForRender(path); } catch(error) { if(isMissingContentError(error)) return null; throw error; }
});
