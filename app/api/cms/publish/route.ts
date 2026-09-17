import type { ContentGraph } from "../../../../types";
import { getDraftContent, publishContent } from "../../../../src/lib/cms/contentStore";
import { authorizeCmsWorkspace, cmsAccessErrorResponse } from "../../../../src/lib/cms/access";
import { triggerWorkspaceDeployment } from "../../../../src/lib/cms/provisioning/database";

export async function POST(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "editor");
    const body = (await request.json().catch(() => ({}))) as {
      graph?: ContentGraph;
      scope?: "all" | "page";
      pageId?: string;
    };
    if (body.scope && body.scope !== "all" && body.scope !== "page") {
      return Response.json({ ok: false, error: "Unsupported publish scope." }, { status: 400 });
    }
    if (body.scope === "page" && !body.pageId) {
      return Response.json({ ok: false, error: "Page publishing requires a page ID." }, { status: 400 });
    }

    const result = await publishContent(
      body.graph ?? (await getDraftContent(workspace)),
      body.scope === "page"
        ? { scope: "page", pageId: body.pageId! }
        : { scope: "all" },
      workspace,
    );

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          graph: result.graph,
          issues: result.issues,
          warnings: result.warnings,
        },
        { status: 422 },
      );
    }

    const deploymentWarnings = await triggerWorkspaceDeployment(workspace);

    return Response.json({
      ok: true,
      graph: result.graph,
      issues: result.issues,
      warnings: [...result.warnings, ...deploymentWarnings],
    });
  } catch (error) {
    return cmsAccessErrorResponse(error, "Publish failed.", 400);
  }
}
