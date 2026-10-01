import type { Metadata } from "next";
import { headers } from "next/headers";
import "../../../src/styles/public.css";
import { getPublishedContent } from "../../../src/lib/cms/contentStore";
import { getContentLocale, getLocaleDirection } from "../../../src/localization/registry";
import { resolvePublishedSiteRoute } from "../../../src/next/resolveRoute";

export const metadata: Metadata = { title: "BlockForge website" };

export default async function SiteRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const graph = await getPublishedContent();
  const path = (await headers()).get("x-blockforge-pathname");
  const route = path ? resolvePublishedSiteRoute(graph, path) : null;
  const locale = getContentLocale(route?.subject, graph.site);
  return <html lang={locale} dir={getLocaleDirection(graph.site, locale)}><body>{children}</body></html>;
}
