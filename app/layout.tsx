import type { Metadata } from "next";
import "../src/styles/public.css";
import { getPublishedContentForRender as getPublishedContent } from "../src/next/publishedContent";
import { headers } from "next/headers";
import { getContentLocale, getLocaleDirection } from "../src/localization/registry";

export const metadata: Metadata = { title: "BlockForge CMS" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const path=(await headers()).get("x-blockforge-pathname") || "/";
  const graph = await getPublishedContent(path);
  const locale = getContentLocale(undefined, graph.site);
  return <html lang={locale} dir={getLocaleDirection(graph.site, locale)}><body>{children}</body></html>;
}
