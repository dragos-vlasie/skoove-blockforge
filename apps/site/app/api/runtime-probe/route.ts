import { getPublishedContent } from "../../../../../src/lib/cms/contentStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const graph = await getPublishedContent();
  const home = graph.pages.find((page) => page.id === "page-home-en" || page.slug === "/");
  return Response.json({
    contentStore: process.env.CMS_CONTENT_STORE || "local",
    tenantId: process.env.CMS_TENANT_ID || "",
    siteId: process.env.CMS_SITE_ID || "",
    siteName: graph.site.siteName,
    pages: graph.pages.length,
    entries: graph.entries.length,
    homePath: home?.path || null,
  });
}
