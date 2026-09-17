import { authorizeCmsPlatformAdmin, cmsAccessErrorResponse } from "../../../../../../src/lib/cms/access";
import { setupClientDeployment } from "../../../../../../src/lib/cms/provisioning/setupClientDeployment";
import { ClientProvisioningError } from "../../../../../../src/lib/cms/provisioning/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> },
) {
  try {
    await authorizeCmsPlatformAdmin(request);
    const { tenantId } = await context.params;
    const body = await request.json() as {
      siteId?: string;
      domain?: string;
      deploymentProjectId?: string;
    };
    const result = await setupClientDeployment({
      tenantId,
      siteId: body.siteId || "main",
      domain: body.domain,
      deploymentProjectId: body.deploymentProjectId,
    });
    return Response.json({ ok: true, result });
  } catch (error) {
    if (error instanceof ClientProvisioningError) {
      return Response.json({ ok: false, error: error.message }, { status: error.status });
    }
    return cmsAccessErrorResponse(error, "Unable to set up website hosting.", 500);
  }
}
