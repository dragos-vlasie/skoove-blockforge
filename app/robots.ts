import type { MetadataRoute } from "next";
import { getPublishedContent } from "../src/lib/cms/contentStore";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const graph = await getPublishedContent();
  return { rules: { userAgent: "*", allow: "/", disallow: ["/cms", "/api/cms"] }, sitemap: `${graph.site.siteUrl.replace(/\/$/, "")}/sitemap.xml` };
}
