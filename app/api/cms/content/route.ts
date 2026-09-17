import type { ContentGraph } from "../../../../types";
import { getDraftContent, saveDraftContent } from "../../../../src/lib/cms/contentStore";
import { validateContentGraph } from "../../../../src/lib/cms/validation";
import { authorizeCmsWorkspace, cmsAccessErrorResponse } from "../../../../src/lib/cms/access";

export async function GET(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "viewer");
    const graph = await getDraftContent(workspace);
    return Response.json({ graph, issues: validateContentGraph(graph) });
  } catch (error) {
    return cmsAccessErrorResponse(error, "Unable to load content.");
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "editor");
    const body = await request.json() as { graph?: ContentGraph };
    if (!body.graph) return Response.json({ error: "Missing content graph." }, { status: 400 });
    const graph = await saveDraftContent(body.graph, workspace);
    return Response.json({ graph, issues: validateContentGraph(graph) });
  } catch (error) {
    return cmsAccessErrorResponse(error, "Unable to save content.", 400);
  }
}
