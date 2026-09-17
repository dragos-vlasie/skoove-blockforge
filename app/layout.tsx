import type { Metadata } from "next";
import "../src/styles/public.css";
import { getPublishedContent } from "../src/lib/cms/contentStore";
import { getContentLocale, getLocaleDirection } from "../src/localization/registry";

export const metadata: Metadata = { title: "BlockForge CMS" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const graph = await getPublishedContent();
  const locale = getContentLocale(undefined, graph.site);
  return <html lang={locale} dir={getLocaleDirection(graph.site, locale)}><body>{children}</body></html>;
}
