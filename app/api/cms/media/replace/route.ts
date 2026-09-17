import type { ContentGraph } from "../../../../../types";
import { replaceUploadedMedia } from "../../../../../src/lib/cms/media";
import { getDraftContent, saveDraftContent } from "../../../../../src/lib/cms/contentStore";
import { validateContentGraph } from "../../../../../src/lib/cms/validation";
import { authorizeCmsWorkspace, cmsAccessErrorResponse } from "../../../../../src/lib/cms/access";

export async function POST(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "editor");
    const form = await request.formData();
    const file = form.get("file");
    const assetId = String(form.get("assetId") ?? "");
    if (!(file instanceof File)) return Response.json({ error: "Missing image file." }, { status: 400 });
    if (!assetId) return Response.json({ error: "Missing asset id." }, { status: 400 });
    const input = form.get("graph");
    const graph = typeof input === "string" && input.trim() ? JSON.parse(input) as ContentGraph : await getDraftContent(workspace);
    const asset = graph.assets.find((item) => item.id === assetId);
    if (!asset) return Response.json({ error: "Asset not found." }, { status: 404 });
    const replacement = await replaceUploadedMedia({ asset, file });
    const nextGraph = await saveDraftContent({ ...graph, assets: graph.assets.map((item) => item.id === assetId ? replacement : item) }, workspace);
    return Response.json({ asset: replacement, graph: nextGraph, issues: validateContentGraph(nextGraph) });
  } catch (error) {
    return cmsAccessErrorResponse(error, "Unable to replace media.", 400);
  }
}
