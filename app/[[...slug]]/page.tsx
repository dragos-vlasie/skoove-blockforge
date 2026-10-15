import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedContentForRender as getPublishedContent } from "../../src/next/publishedContent";
import { withTrailingSlash } from "../../src/lib/cms/routing";
import { PublicSite, routeMetadata } from "../../src/next/PublicSite";
import { resolvePublishedRoute } from "../../src/next/resolveRoute";

type Props = { params: Promise<{ slug?: string[] }> };
const pathOf = (segments: string[] = []) => withTrailingSlash(segments.length ? `/${segments.join("/")}` : "/");

async function loadRoute(params: Props["params"]) {
  const path = pathOf((await params).slug);
  const graph = await getPublishedContent(path);
  const rule = graph.redirects.find((candidate) => withTrailingSlash(candidate.from) === path);
  if (rule) rule.status === 301 ? permanentRedirect(rule.to) : redirect(rule.to);
  const route = resolvePublishedRoute(graph, path);
  if (route || graph.site.siteName !== "Skoove Blog") return route;
  const alias = resolvePublishedRoute(graph, withTrailingSlash(`/blog${path}`));
  if (!alias) return null;
  return resolvePublishedRoute(await getPublishedContent(alias.path), alias.path);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = await loadRoute(params);
  return route ? routeMetadata(route) as Metadata : { title: "404 | BlockForge CMS", robots: { index: false, follow: false } };
}

export default async function PublishedPage({ params }: Props) {
  const route = await loadRoute(params);
  if (!route) notFound();
  return <PublicSite route={route} />;
}
