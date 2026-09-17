import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getDraftContent } from "../../../../../src/lib/cms/contentStore";
import { authorizeCmsWorkspace, cmsAccessErrorResponse } from "../../../../../src/lib/cms/access";

export async function POST(request: Request) {
  try {
    const { workspace } = await authorizeCmsWorkspace(request, "viewer");
    const body = await request.json().catch(() => ({})) as any;
    const graph = body.graph ?? await getDraftContent(workspace);
    const urls: string[] = Array.isArray(body.urls) ? body.urls : (graph.assets ?? []).map((asset: any) => asset.url);
    const results = await Promise.all(urls.filter(Boolean).map(async (url) => {
      if (url.startsWith("/")) {
        const ok = existsSync(resolve(process.cwd(), `public${url.split(/[?#]/)[0]}`));
        return { url, label: "Asset", ok, status: ok ? 200 : 404, message: ok ? "Local file found." : "Local file is missing from public/." };
      }
      try {
        const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(6000) });
        return { url, label: "Asset", ok: response.ok, status: response.status, message: response.ok ? "URL responded successfully." : `URL returned ${response.status}.` };
      } catch (error) {
        return { url, label: "Asset", ok: false, status: null, message: error instanceof Error ? error.message : "URL could not be reached." };
      }
    }));
    return Response.json({ results });
  } catch (error) {
    return cmsAccessErrorResponse(error, "Unable to check media URLs.", 400);
  }
}
