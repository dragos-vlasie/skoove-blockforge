import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadPublishedRoute, type PublishedPageProps } from "../../../../src/next/publishedRoute";
import { PublicSite, routeMetadata } from "../../../../src/next/PublicSite";

export const revalidate = false;
export const dynamicParams = true;

export function generateStaticParams() {
  // Verify and warm the homepage at build time. Other routes render on first
  // visit and remain cached until publishing; deployment never crawls the site.
  // Sitemap generation still reads the complete, compact routing index.
  return [{ slug: [] as string[] }];
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
