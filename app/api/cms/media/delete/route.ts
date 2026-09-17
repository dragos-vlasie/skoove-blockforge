import type { ContentGraph } from "../../../../../types";
import { deleteUploadedMedia } from "../../../../../src/lib/cms/media";
import { getDraftContent, saveDraftContent } from "../../../../../src/lib/cms/contentStore";
import { validateContentGraph } from "../../../../../src/lib/cms/validation";
import { authorizeCmsWorkspace, cmsAccessErrorResponse } from "../../../../../src/lib/cms/access";

export async function POST(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "editor");
    const body = await request.json() as { assetId?: string; graph?: ContentGraph };
    const assetId = String(body.assetId ?? "");
    if (!assetId) return Response.json({ error: "Missing asset id." }, { status: 400 });
    const graph = body.graph ?? await getDraftContent(workspace);
    const asset = graph.assets.find((item) => item.id === assetId);
    if (!asset) return Response.json({ error: "Asset not found." }, { status: 404 });
    await deleteUploadedMedia(asset);
    const nextGraph = await saveDraftContent({ ...graph, assets: graph.assets.filter((item) => item.id !== assetId) }, workspace);
    return Response.json({ graph: nextGraph, issues: validateContentGraph(nextGraph) });
  } catch (error) {
    return cmsAccessErrorResponse(error, "Unable to delete media.", 400);
  }
}
