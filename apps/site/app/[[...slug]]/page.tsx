import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadPublishedRoute, type PublishedPageProps } from "../../../../src/next/publishedRoute";
import { PublicSite, routeMetadata } from "../../../../src/next/PublicSite";
import { getPublishedContentForRender } from "../../../../src/next/publishedContent";
import { publishedPaths } from "../../../../src/next/publishedPaths";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  // The home context contains the route index without fetching every article body.
  // A failed read aborts the build instead of deploying an empty website.
  const graph = await getPublishedContentForRender("/");
  return publishedPaths(graph).map((path) => ({ slug: path.split("/").filter(Boolean) }));
}

export async function generateMetadata({ params }: PublishedPageProps): Promise<Metadata> {
  const route = await loadPublishedRoute(params);
  return route ? routeMetadata(route) as Metadata
    : { title: "404 | BlockForge CMS", robots: { index: false, follow: false } };
}

export default async function PublishedPage({ params }: PublishedPageProps) {
  const route = await loadPublishedRoute(params);
  if (!route) notFound();
  return <PublicSite route={route} />;
}
