import type { MetadataRoute } from "next";
import { getOptionalPublishedContentForRender } from "../src/next/publishedContent";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const graph = await getOptionalPublishedContentForRender("/");
  if (!graph) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/cms", "/api/cms"] }, sitemap: `${graph.site.siteUrl.replace(/\/$/, "")}/sitemap.xml` };
}
