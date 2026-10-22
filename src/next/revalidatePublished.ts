import { revalidatePath, revalidateTag } from "next/cache";
import { PublicationError, publishedCacheTag, verifyPublicationRequest } from "../lib/publishing/protocol";
import type { CmsWorkspaceScope } from "../lib/cms/workspaceTypes";

export function invalidatePublishedWorkspace(scope: CmsWorkspaceScope) {
  revalidateTag(publishedCacheTag(scope), { expire: 0 });
  revalidatePath("/", "layout");
}

export async function POST(request: Request) {
  try {
    const notice = await verifyPublicationRequest(request, process.env);
    invalidatePublishedWorkspace(notice);
    // Navigation, shared sections, listings, redirects and SEO can affect every
    // route. Expire the layout, including cached 404s, sitemap and robots. Pages
    // regenerate only as visited, never on a timer or in a site-wide fetch loop.
    return Response.json({ ok: true, releaseId: notice.releaseId, releaseRecovery: 1 }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof PublicationError ? error.message : "Unable to refresh published website." },
      { status: error instanceof PublicationError ? error.status : 500, headers: { "cache-control": "no-store" } });
  }
}
