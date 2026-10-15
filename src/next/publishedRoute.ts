import { permanentRedirect, redirect } from "next/navigation";
import { getOptionalPublishedContentForRender } from "./publishedContent";
import { publicAsset } from "../lib/cms/publicApi";
import { withTrailingSlash } from "../lib/cms/routing";
import { resolvePublishedRoute } from "./resolveRoute";

export type PublishedPageProps = { params: Promise<{ slug?: string[] }> };

export async function loadPublishedRoute(params: PublishedPageProps["params"]) {
  const segments = (await params).slug ?? [];
  const path = withTrailingSlash(segments.length ? `/${segments.join("/")}` : "/");
  const graph = await getOptionalPublishedContentForRender(path);
  if (!graph) return null;
  const rule = graph.redirects.find((candidate) => withTrailingSlash(candidate.from) === path);
  if (rule) rule.status === 301 ? permanentRedirect(rule.to) : redirect(rule.to);
  const publicGraph = { ...graph, assets: graph.assets.map(publicAsset) };
  const route = resolvePublishedRoute(publicGraph, path);
  if (route || graph.site.siteName !== "Skoove Blog") return route;
  const alias = resolvePublishedRoute(publicGraph, withTrailingSlash(`/blog${path}`));
  if (!alias) return null;
  const aliasGraph = await getOptionalPublishedContentForRender(alias.path);
  return aliasGraph ? resolvePublishedRoute(aliasGraph, alias.path) : null;
}
