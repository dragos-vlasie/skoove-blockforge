import type { Metadata } from "next";
import "../../../src/styles/public.css";
import { getOptionalPublishedContentForRender as getOptionalPublishedContent } from "../../../src/next/publishedContent";
import { getContentLocale, getLocaleDirection } from "../../../src/localization/registry";

export const metadata: Metadata = { title: "BlockForge website" };

export default async function SiteRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Request headers opt every child route out of ISR. Site-wide shell settings
  // come from the published home context; page reads remain scoped separately.
  const graph = await getOptionalPublishedContent("/");
  if (!graph) return <html lang="en" dir="ltr"><body>{children}</body></html>;
  const locale = getContentLocale(undefined, graph.site);
  return <html lang={locale} dir={getLocaleDirection(graph.site, locale)}><body>{children}</body></html>;
}
