import type { ContentGraph } from "../../../../../types";
import { saveUploadedMedia } from "../../../../../src/lib/cms/media";
import { getDraftContent, saveDraftContent } from "../../../../../src/lib/cms/contentStore";
import { validateContentGraph } from "../../../../../src/lib/cms/validation";
import { authorizeCmsWorkspace, cmsAccessErrorResponse } from "../../../../../src/lib/cms/access";

export async function POST(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "editor");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Missing image file." }, { status: 400 });
    const input = form.get("graph");
    const graph = typeof input === "string" && input.trim() ? JSON.parse(input) as ContentGraph : await getDraftContent(workspace);
    const asset = await saveUploadedMedia({
      file,
      alt: String(form.get("alt") ?? ""),
      folder: String(form.get("folder") ?? ""),
      tags: String(form.get("tags") ?? ""),
      scope: workspace,
    });
    const nextGraph = await saveDraftContent({ ...graph, assets: [asset, ...(graph.assets ?? [])] }, workspace);
    return Response.json({ asset, graph: nextGraph, issues: validateContentGraph(nextGraph) });
  } catch (error) {
    return cmsAccessErrorResponse(error, "Unable to upload media.", 400);
  }
}
