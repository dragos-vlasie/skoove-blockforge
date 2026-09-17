import {
  authorizeCmsWorkspace,
  cmsAccessErrorResponse,
} from "../../../../src/lib/cms/access";
import { createPreviewToken, derivePreviewSecret } from "../../../../src/lib/preview/token";

const requestOrigin = (request: Request) => {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) url.host = forwardedHost;
  if (forwardedProtocol === "http" || forwardedProtocol === "https") url.protocol = `${forwardedProtocol}:`;
  return url.origin;
};

export async function GET(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "viewer");
    if (workspace.developmentMode !== "code") {
      return Response.json({ error: "Remote preview is available only for Code-mode websites." }, { status: 409 });
    }

    const previewBaseUrl = workspace.deploymentUrl || workspace.siteUrl;
    if (!previewBaseUrl) {
      return Response.json({ error: "Deploy the client website before opening its live preview." }, { status: 409 });
    }

    const secret = derivePreviewSecret(
      String(process.env.CMS_SESSION_SECRET || ""),
      workspace.tenantId,
      workspace.siteId,
    );
    const token = createPreviewToken({
      tenantId: workspace.tenantId,
      siteId: workspace.siteId,
      parentOrigin: requestOrigin(request),
    }, secret);
    const previewOrigin = new URL(previewBaseUrl);
    if (!["http:", "https:"].includes(previewOrigin.protocol)) {
      return Response.json({ error: "The client deployment URL is invalid." }, { status: 409 });
    }
    const previewUrl = new URL("/blockforge-preview/", previewOrigin);
    previewUrl.searchParams.set("token", token);
    return Response.json({ previewUrl: previewUrl.toString(), expiresIn: 300 });
  } catch (error) {
    return cmsAccessErrorResponse(error, "Unable to open the client preview.", 500);
  }
}
