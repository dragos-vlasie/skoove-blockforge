import { cache } from "react";
import { getPublishedContent, getPublishedContentForPath } from "../lib/cms/contentStore";

import { isMissingContentError } from "../lib/cms/storage/splitContent";
import { createPublicContentGraph } from "../lib/cms/publicApi";

// Layout, metadata and page rendering share one snapshot per server request.
// Keep this separate from the uncached facade used by mutation/API handlers.
export const getPublishedContentForRender = cache(async (path = "/") => {
  // Existing extensions can read arbitrary graph fields. Keep their contract
  // until they explicitly adopt scoped delivery instead of dropping data.
  // The Skoove hero was checked: it uses its own content only.
  // This client can therefore render scoped graphs.
  return createPublicContentGraph((await getPublishedContentForPath(path)).graph);
});

export const getOptionalPublishedContentForRender = cache(async (path = "/") => {
 try { return await getPublishedContentForRender(path); } catch(error) { if(isMissingContentError(error)) return null; throw error; }
});
