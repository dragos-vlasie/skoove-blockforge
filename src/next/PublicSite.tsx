import type { CSSProperties, ReactNode } from "react";
import { buildJsonLd, resolveSeo } from "../lib/cms/seo";
import {
  getCategoryEntries,
  getCollectionEntries,
  getEntryPath,
  resolveNavigationHref,
} from "../lib/cms/routing";
import {
  getContentLocale,
  getLocaleDirection,
  getLocalizedHomePath,
} from "../localization/registry";
import { resolveLocalizationMessages } from "../localization/messages";
import {
  getDefaultTranslationAlternate,
  getTranslationAlternates,
} from "../localization/translations";
import { createSemanticThemeStyle } from "../themes/semanticTokens";
import { getGoogleFontHref, getThemePreset } from "../themes/registry";
import { AnalyticsTracker } from "./AnalyticsTracker";
import { TemplateRenderer } from "./Templates";

function DesktopNavigation({ items, graph, label }: { items: any[]; graph: any; label: string }) {
  return <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label={label}>
    {items.map((item) => {
      const children = item.children ?? [];
      const isMega = children.some((child: any) => child.children?.length);
      return <div className="group relative" key={item.id}>
        <a className="flex min-h-11 items-center gap-1.5 rounded-[var(--site-radius-sm)] px-3 py-2 text-sm font-bold text-[var(--site-text)] no-underline transition hover:bg-[var(--site-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-primary)]" href={resolveNavigationHref(item, graph)}>
          <span>{item.label}</span>{children.length > 0 && <span className="text-[10px] text-[var(--site-primary)] transition group-hover:rotate-180">▼</span>}
        </a>
        {children.length > 0 && <div className={`invisible absolute right-0 top-full z-50 mt-2 grid min-w-60 translate-y-2 gap-2 rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-background)] p-3 opacity-0 shadow-[var(--site-card-shadow)] transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 ${isMega ? "w-[min(46rem,calc(100vw-3rem))] grid-cols-2" : ""}`}>
          {children.map((child: any) => <div className="min-w-0 rounded-[var(--site-radius-sm)] p-2" key={child.id}>
            <a className="block rounded-lg px-3 py-2 font-extrabold text-[var(--site-heading)] no-underline hover:bg-[var(--site-surface-soft)]" href={resolveNavigationHref(child, graph)}>{child.label}</a>
            {child.children?.length > 0 && <div className="grid gap-1 px-3 pb-2">{child.children.map((grandchild: any) => <a className="py-1.5 text-sm text-[var(--site-muted)] no-underline hover:text-[var(--site-primary)]" href={resolveNavigationHref(grandchild, graph)} key={grandchild.id}>{grandchild.label}</a>)}</div>}
          </div>)}
        </div>}
      </div>;
    })}
  </nav>;
}

function SiteChrome({ graph, children, subject, preview = false }: { graph: any; children: ReactNode; subject: any; preview?: boolean }) {
  const locale = getContentLocale(subject, graph.site);
  const messages = resolveLocalizationMessages(locale, graph.site.localeMessages);
  const homePath = getLocalizedHomePath(graph.site, locale);
  const headerMenus = graph.navigation.filter((menu: any) => menu.location === "header" && getContentLocale(menu, graph.site) === locale);
  const footerMenus = graph.navigation.filter((menu: any) => menu.location === "footer" && getContentLocale(menu, graph.site) === locale);
  const explicitHeaderItems = headerMenus.flatMap((menu: any) => menu.items ?? []);
  const autoHeaderItems = graph.pages
    .filter((page: any) => page.status === "published" && page.showInNavigation && getContentLocale(page, graph.site) === locale)
    .sort((a: any, b: any) => a.order - b.order)
    .map((page: any) => ({ id: `auto-${page.id}`, label: page.navigationLabel || page.title, targetType: "page", targetId: page.id }));
  const headerItems = explicitHeaderItems.length > 0 ? explicitHeaderItems : autoHeaderItems;
  const footerItems = footerMenus.flatMap((menu: any) => menu.items ?? []);
  const design = graph.site.design ?? {};
  const theme = getThemePreset(design.themeId || "clean-saas", design);
  const fontHref = getGoogleFontHref([design.headingFont, design.bodyFont]);

  return <div
    className="site-root"
    lang={locale}
    dir={getLocaleDirection(graph.site, locale)}
    style={createSemanticThemeStyle(graph.site) as CSSProperties}
    data-site-theme={theme.id}
    data-theme-family={theme.recipe.family}
    data-theme-recipe-version={theme.recipe.version}
  >
    {fontHref && <><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link rel="stylesheet" href={fontHref} /></>}
    <header className="sticky top-0 z-50 mx-auto flex min-h-20 w-full items-center gap-6 border-b border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-background)_92%,transparent)] px-[var(--site-gutter)] py-4 text-[var(--site-text)] backdrop-blur-xl">
      <a className="flex min-w-0 shrink-0 items-center gap-3 font-[var(--font-heading)] text-lg font-extrabold text-[var(--site-heading)] no-underline" href={homePath} aria-label={`${graph.site.siteName} ${messages.home}`}>
        {graph.site.logo ? <img className="max-h-12 w-auto max-w-56 object-contain" src={graph.site.logo} alt={graph.site.siteName} /> : <><span className="grid h-10 w-10 place-items-center rounded-[var(--site-radius-sm)] bg-[var(--site-primary)] text-[var(--site-on-primary)]">{graph.site.siteName.slice(0, 1) || "B"}</span><span>{graph.site.siteName}</span></>}
      </a>
      {headerItems.length > 0 && <DesktopNavigation items={headerItems} graph={graph} label={messages.mainNavigation} />}
      {headerItems.length > 0 && <details className="group ml-auto lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-[var(--site-radius-sm)] border border-[var(--site-border)] px-4 py-2 text-sm font-extrabold marker:hidden [&::-webkit-details-marker]:hidden"><span>{messages.menu}</span><span className="grid gap-1 group-open:rotate-90" aria-hidden="true"><i className="block h-0.5 w-4 bg-current" /><i className="block h-0.5 w-4 bg-current" /><i className="block h-0.5 w-4 bg-current" /></span></summary>
        <nav className="absolute inset-x-0 top-full max-h-[calc(100vh-5rem)] overflow-y-auto border-b border-[var(--site-border)] bg-[var(--site-background)] p-[var(--site-gutter)] shadow-[var(--site-card-shadow)]" aria-label={messages.mobileNavigation}>
          {headerItems.map((item: any) => <div className="border-b border-[var(--site-border)] py-3 last:border-0" key={item.id}>
            <a className="block py-2 font-[var(--font-heading)] text-xl font-extrabold text-[var(--site-heading)] no-underline" href={resolveNavigationHref(item, graph)}>{item.label}</a>
            {item.children?.length > 0 && <div className="grid gap-1 pb-2 pl-4">{item.children.map((child: any) => <a className="py-2 text-[var(--site-muted)] no-underline" href={resolveNavigationHref(child, graph)} key={child.id}>{child.label}</a>)}</div>}
          </div>)}
        </nav>
      </details>}
    </header>
    <main aria-label={subject.title ?? subject.name}>{children}</main>
    <footer className="grid gap-10 border-t border-[color-mix(in_srgb,var(--site-on-inverse)_18%,transparent)] bg-[var(--site-inverse)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-on-inverse)] lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
      <div className="max-w-md"><strong className="font-[var(--font-heading)] text-2xl">{graph.site.siteName}</strong><p className="mt-4 leading-7 text-[color-mix(in_srgb,var(--site-on-inverse)_68%,transparent)]">{graph.site.defaultDescription}</p></div>
      {footerItems.length > 0 && <nav className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label={messages.footerNavigation}>{footerItems.map((item: any) => <div className="min-w-0" key={item.id}>
        <a className="block py-1 font-extrabold text-[var(--site-on-inverse)] no-underline" href={resolveNavigationHref(item, graph)}>{item.label}</a>
        {item.children?.length > 0 && <div className="mt-3 grid gap-2">{item.children.map((child: any) => <a className="text-sm text-[color-mix(in_srgb,var(--site-on-inverse)_68%,transparent)] no-underline hover:text-[var(--site-on-inverse)]" href={resolveNavigationHref(child, graph)} key={child.id}>{child.label}</a>)}</div>}
      </div>)}</nav>}
    </footer>
    {!preview && <AnalyticsTracker />}
  </div>;
}

export function PublicSite({ route, preview = false }: { route: any; preview?: boolean }) {
  const locale = getContentLocale(route.subject, route.graph.site);
  const messages = resolveLocalizationMessages(locale, route.graph.site.localeMessages);
  const crumbs = [{ name: messages.home, path: getLocalizedHomePath(route.graph.site, locale) }, { name: route.subject.title ?? route.subject.name, path: route.path }];
  const entries = route.routeType === "category" ? getCategoryEntries(route.subject, route.graph) : route.routeType === "collection" ? getCollectionEntries(route.subject, route.graph) : [];
  const collectionItems = entries.map((entry: any) => ({ title: entry.title, path: getEntryPath(entry, route.graph.collectionDefinitions.find((item: any) => item.id === entry.collectionId), route.graph) }));
  const jsonLd = buildJsonLd({ graph: route.graph, subject: route.subject, path: route.path, collection: route.collection, crumbs, collectionItems });
  const hero = route.subject.blocks?.find((block: any) => ["HERO", "RENTAL_HERO", "PUBLICATION_HERO", "PUBLICATION_GATEWAY_CAROUSEL"].includes(block.type));
  const heroImage = (hero?.type === "RENTAL_HERO" ? hero.content?.imageUrl : hero?.type === "PUBLICATION_HERO" ? hero.content?.portraitImage : hero?.type === "PUBLICATION_GATEWAY_CAROUSEL" ? hero.content?.items?.[0]?.image : hero?.content?.bgImage) || route.subject.fields?.featuredImage || "";
  return <>{heroImage && <link rel="preload" as="image" href={heroImage} fetchPriority="high" />}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><SiteChrome graph={route.graph} subject={route.subject} preview={preview}><TemplateRenderer route={route} /></SiteChrome></>;
}

export const routeMetadata = (route: any) => {
  const resolved = resolveSeo(route.subject, route.graph.site, route.path);
  const locale = getContentLocale(route.subject, route.graph.site);
  const messages = resolveLocalizationMessages(locale, route.graph.site.localeMessages);
  const title = route.page > 1 ? `${resolved.title} – ${messages.page} ${route.page}` : resolved.title;
  const schemaType = route.collection?.schemaType || resolved.schemaType;
  const isArticle = schemaType === "Article";
  const categories = "categoryIds" in route.subject ? route.subject.categoryIds.map((id: string) => route.graph.categories.find((category: any) => category.id === id)).filter(Boolean) : [];
  const translationAlternates = getTranslationAlternates(route.graph, route.subject);
  const defaultAlternate = getDefaultTranslationAlternate(route.graph, translationAlternates);
  const languages = Object.fromEntries([
    ...translationAlternates.map((alternate) => [alternate.hreflang, alternate.url]),
    ...(defaultAlternate ? [["x-default", defaultAlternate.url]] : []),
  ]);
  return {
    title,
    description: resolved.description,
    keywords: resolved.keywords || undefined,
    authors: route.subject.author ? [{ name: route.subject.author }] : undefined,
    icons: { icon: route.graph.site.favicon || "/favicon.ico" },
    alternates: { canonical: resolved.canonical, languages },
    robots: resolved.robots,
    openGraph: {
      type: isArticle ? "article" : schemaType === "Product" ? "website" : schemaType === "Person" ? "profile" : "website",
      locale: locale.replace("-", "_"),
      alternateLocale: translationAlternates.filter((alternate) => alternate.locale !== locale).map((alternate) => alternate.locale.replace("-", "_")),
      title: route.page > 1 ? `${resolved.ogTitle} – ${messages.page} ${route.page}` : resolved.ogTitle,
      description: resolved.ogDescription,
      url: resolved.canonical,
      images: resolved.ogImage ? [resolved.ogImage] : [],
      siteName: route.graph.site.siteName,
      ...(isArticle ? { publishedTime: route.subject.publishedAt, modifiedTime: route.subject.updatedAt, authors: route.subject.author ? [route.subject.author] : undefined, section: route.collection?.name, tags: categories.map((category: any) => category.name) } : {}),
    },
    twitter: { card: resolved.twitterCard, title: resolved.ogTitle, description: resolved.ogDescription, images: resolved.ogImage ? [resolved.ogImage] : [] },
    generator: "BlockForge CMS + Next.js",
  };
};
