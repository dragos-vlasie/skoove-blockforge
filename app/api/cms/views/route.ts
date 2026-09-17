import { getViewAnalyticsSummary } from "../../../../src/lib/cms/viewAnalytics";
import { authorizeCmsWorkspace, cmsAccessErrorResponse } from "../../../../src/lib/cms/access";

export async function GET(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "viewer");
    const rangeDays = Number(new URL(request.url).searchParams.get("range") || 30);
    return Response.json(await getViewAnalyticsSummary({
      ...process.env,
      CMS_TENANT_ID: workspace.tenantId,
      CMS_SITE_ID: workspace.siteId,
    }, { rangeDays }));
  } catch (error) {
    return cmsAccessErrorResponse(error, "Unable to load view analytics.");
  }
}
