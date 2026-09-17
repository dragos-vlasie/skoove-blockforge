import { getCategoryEntries, getCategoryPath, getCollectionEntries, getEntryPath, getPublishedEntries } from "../lib/cms/routing";
import { getContentLocale, getLocalizedHomePath } from "../localization/registry";
import { resolveLocalizationMessages } from "../localization/messages";
import { resolveCategoryTemplateId, resolveCollectionTemplateId, resolveEntryTemplateId, resolvePageTemplateId } from "../templates/registry";
import { StructuredTextRenderer } from "../blocks/text/View";
import { BlockRenderer } from "./BlockRenderer";

const entryImage = (entry: any) => entry.fields?.featuredImage || entry.fields?.image || entry.seo?.ogImage || "";

function LandingPage({ route }: { route: any }) {
  return <div className="template-page">{(route.subject.blocks ?? []).map((block: any) => <BlockRenderer key={block.id} block={block} graph={route.graph} subject={route.subject} page={route.page} path={route.path} />)}</div>;
}

function Article({ route }: { route: any }) {
  const { graph, subject: entry, collection } = route;
  const fields = entry.fields ?? {};
  const locale = getContentLocale(entry, graph.site);
  const messages = resolveLocalizationMessages(locale, graph.site.localeMessages);
  const homePath = getLocalizedHomePath(graph.site, locale);
  const categories = (entry.categoryIds ?? []).map((id: string) => graph.categories.find((category: any) => category.id === id)).filter(Boolean);
  const related = getPublishedEntries(graph, locale).filter((candidate: any) => candidate.id !== entry.id && candidate.collectionId === entry.collectionId).filter((candidate: any) => !entry.categoryIds?.length || candidate.categoryIds?.some((id: string) => entry.categoryIds.includes(id))).slice(0, 3);
  const image = entryImage(entry);
  const richBody = !entry.blocks?.length && fields.body?.type === "doc" ? fields.body : null;
  const textBody = !entry.blocks?.length && typeof fields.body === "string" ? fields.body : !entry.blocks?.length && typeof fields.content === "string" ? fields.content : "";
  return <article className="min-w-0 bg-[var(--site-background)] text-[var(--site-text)]">
    <header className="relative mx-auto w-full max-w-[var(--site-container-width)] px-[var(--site-gutter)] pt-6 sm:pt-8" data-has-image={image ? "true" : "false"}>
      {image && <figure className="relative m-0 min-h-[28rem] overflow-hidden rounded-[var(--site-media-radius)] bg-[var(--site-inverse)] shadow-[var(--site-media-shadow)] sm:min-h-[36rem] lg:min-h-[42rem]"><img className="absolute inset-0 h-full w-full object-cover" src={image} alt={fields.featuredImageAlt || fields.imageAlt || entry.title} loading="eager" decoding="async" fetchPriority="high" style={{ objectPosition: fields.featuredImagePosition || fields.imagePosition || "center" }} /><span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,color-mix(in_srgb,var(--site-inverse)_86%,transparent)_100%)]" aria-hidden="true" /></figure>}
      <div className={`relative z-10 ${image ? "-mt-80 px-6 pb-10 text-[var(--site-on-inverse)] sm:-mt-96 sm:px-10 sm:pb-14 lg:max-w-5xl lg:px-14" : "py-[var(--site-section-space-compact)]"}`}><div>
        <nav className={`mb-6 flex flex-wrap items-center gap-2 text-sm ${image ? "text-[color-mix(in_srgb,var(--site-on-inverse)_72%,transparent)]" : "text-[var(--site-muted)]"}`} aria-label="Breadcrumb"><a className="font-semibold text-inherit no-underline hover:underline" href={homePath}>{messages.home}</a>{categories[0] && <><span>/</span><a href={getCategoryPath(categories[0], graph)}>{categories[0].name}</a></>}</nav>
        {collection && (categories[0] ? <a className="inline-flex rounded-[var(--site-button-radius)] bg-[var(--site-accent)] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--site-on-accent)] no-underline" href={getCategoryPath(categories[0], graph)}>{categories[0].name}</a> : <span className="inline-flex rounded-[var(--site-button-radius)] bg-[var(--site-accent)] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--site-on-accent)]">{collection.singularName}</span>)}
        <h1 className={`mt-6 max-w-[19ch] font-[var(--font-heading)] text-[clamp(2.75rem,7vw,6.5rem)] font-[var(--site-heading-weight)] leading-[0.94] tracking-[var(--site-heading-tracking)] ${image ? "text-[var(--site-on-inverse)]" : "text-[var(--site-heading)]"}`}>{entry.title}</h1>
      </div></div>
    </header>
    <div className="mx-auto grid w-full max-w-[var(--site-container-width)] gap-12 px-[var(--site-gutter)] py-[var(--site-section-space-compact)] lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"><div className="prose prose-slate min-w-0 max-w-none prose-headings:font-[var(--font-heading)] prose-headings:text-[var(--site-heading)] prose-p:text-[var(--site-text)] prose-a:text-[var(--site-primary)]">
      {richBody && <StructuredTextRenderer nodes={richBody} />}
      {textBody && textBody.split(/\n{2,}/).map((paragraph: string, index: number) => <p key={index}>{paragraph}</p>)}
      {(entry.blocks ?? []).map((block: any) => <BlockRenderer key={block.id} block={block} graph={graph} subject={entry} />)}
    </div>
    {categories.length > 0 && <aside className="sticky top-28 hidden min-w-0 border-t border-[var(--site-border)] pt-6 lg:block" aria-label="Article details"><section><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-heading)]">Topics</p><div className="mt-4 flex flex-wrap gap-2">{categories.map((category: any) => <a className="rounded-full border border-[var(--site-border)] px-3 py-1.5 text-xs font-bold text-[var(--site-text)] no-underline hover:border-[var(--site-primary)] hover:text-[var(--site-primary)]" key={category.id} href={getCategoryPath(category, graph)}>{category.name}</a>)}</div></section></aside>}
    </div>
    {related.length > 0 && collection && <section className="mx-auto w-full max-w-[var(--site-container-width)] px-[var(--site-gutter)] pb-[var(--site-section-space)]"><header className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">Keep exploring</p><h2 className="mt-3 font-[var(--font-heading)] text-3xl font-extrabold tracking-tight text-[var(--site-heading)] sm:text-4xl">More stories for the road</h2></header><div className="mt-8 grid gap-4 md:grid-cols-3">{related.map((item: any) => <a className="group overflow-hidden rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] text-[var(--site-heading)] no-underline" key={item.id} href={getEntryPath(item, collection, graph)}>{entryImage(item) && <img className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.025]" src={entryImage(item)} alt={item.fields?.featuredImageAlt || item.title} loading="lazy" />}<span className="block p-5 font-[var(--font-heading)] text-lg font-extrabold leading-snug">{item.title}</span></a>)}</div></section>}
  </article>;
}

function AuthorProfile({ route }: { route: any }) {
  const { graph, subject: entry } = route;
  const fields = entry.fields ?? {};
  const photo = fields.photo || fields.avatar || entryImage(entry);
  const locale = getContentLocale(entry, graph.site);
  const authored = getPublishedEntries(graph, locale).filter((candidate: any) => candidate.id !== entry.id && candidate.author === entry.title).slice(0, 6);
  return <article className="text-[var(--site-text)]">
    <header className="mx-auto grid w-full max-w-[var(--site-container-width)] gap-8 px-[var(--site-gutter)] py-[var(--site-section-space-compact)] lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)] lg:items-center">
      {photo && <img className="aspect-square w-full rounded-[var(--site-media-radius)] object-cover shadow-[var(--site-media-shadow)]" src={photo} alt={entry.title} loading="eager" />}
      <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">Author</p><h1 className="mt-4 font-[var(--font-heading)] text-[clamp(3rem,7vw,6rem)] font-[var(--site-heading-weight)] leading-[0.94] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{entry.title}</h1>{(fields.role || fields.title) && <p className="mt-4 font-bold text-[var(--site-primary)]">{fields.role || fields.title}</p>}{(fields.bio || fields.description || entry.excerpt) && <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--site-muted)]">{fields.bio || fields.description || entry.excerpt}</p>}{(fields.website || fields.url) && <a className="mt-6 inline-flex min-h-11 items-center rounded-[var(--site-button-radius)] bg-[var(--site-primary)] px-5 py-3 font-extrabold text-[var(--site-on-primary)] no-underline" href={fields.website || fields.url}>Visit website</a>}</div>
    </header>
    {(entry.blocks ?? []).map((block: any) => <BlockRenderer key={block.id} block={block} graph={graph} subject={entry} />)}
    {authored.length > 0 && <section className="mx-auto w-full max-w-[var(--site-container-width)] px-[var(--site-gutter)] pb-[var(--site-section-space)]"><h2 className="mb-8 font-[var(--font-heading)] text-3xl font-extrabold">Articles by {entry.title}</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{authored.map((item: any) => { const owner = graph.collectionDefinitions.find((definition: any) => definition.id === item.collectionId); return <article key={item.id} className="overflow-hidden rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)]">{entryImage(item) && <img className="aspect-[4/3] w-full object-cover" src={entryImage(item)} alt={item.title} loading="lazy" />}<div className="p-5"><h3><a href={getEntryPath(item, owner, graph)}>{item.title}</a></h3>{item.excerpt && <p>{item.excerpt}</p>}</div></article>; })}</div></section>}
  </article>;
}

function BlogIndex({ route }: { route: any }) {
  const { graph, subject: collection } = route;
  const entries = getCollectionEntries(collection, graph);
  const featured = entries.slice(0, 3);
  const remaining = entries.slice(3);
  const locale = getContentLocale(collection, graph.site);
  const categories = graph.categories.filter((category: any) => getContentLocale(category, graph.site) === locale && (category.collectionIds.length === 0 || category.collectionIds.includes(collection.id) || collection.categoryIds?.includes(category.id)));
  const card = (entry: any) => <article key={entry.id} className="overflow-hidden rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] shadow-[var(--site-card-shadow)]">{entryImage(entry) && <img className="aspect-[4/3] w-full object-cover" src={entryImage(entry)} alt={entry.title} loading="lazy" />}<div className="p-5"><h2 className="font-[var(--font-heading)] text-xl font-extrabold"><a href={getEntryPath(entry, collection, graph)}>{entry.title}</a></h2>{entry.excerpt && <p className="mt-3 line-clamp-3 leading-7 text-[var(--site-muted)]">{entry.excerpt}</p>}</div></article>;
  return <section className="mx-auto w-full max-w-[var(--site-container-width)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]"><header className="max-w-5xl border-b border-[var(--site-border)] pb-10"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">Collection</p><h1 className="mt-4 font-[var(--font-heading)] text-[clamp(3rem,8vw,7rem)]">{collection.name}</h1>{collection.description && <p className="mt-6 max-w-3xl text-lg text-[var(--site-muted)]">{collection.description}</p>}<p className="mt-6">{entries.length} {entries.length === 1 ? collection.singularName : collection.name}</p></header>{categories.length > 0 && <nav className="my-8 flex flex-wrap gap-2" aria-label={`${collection.name} topics`}>{categories.map((category: any) => <a key={category.id} className="rounded-full border border-[var(--site-border)] px-4 py-2" href={getCategoryPath(category, graph)}>{category.name}</a>)}</nav>}<div className="grid gap-5 lg:grid-cols-3">{featured.map(card)}</div>{remaining.length > 0 && <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{remaining.map(card)}</div>}{entries.length === 0 && <p>No published entries yet.</p>}</section>;
}

function CategoryIndex({ route }: { route: any }) {
  const { graph, subject: category } = route;
  const locale = getContentLocale(category, graph.site);
  const messages = resolveLocalizationMessages(locale, graph.site.localeMessages);
  const homePath = getLocalizedHomePath(graph.site, locale);
  const entries = getCategoryEntries(category, graph).sort((a: any, b: any) => String(b.publishedAt || b.updatedAt).localeCompare(String(a.publishedAt || a.updatedAt)));
  const childCategories = graph.categories.filter((candidate: any) => candidate.parentId === category.id && candidate.publicIndex && getContentLocale(candidate, graph.site) === locale);
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const current = Math.min(Math.max(1, Number(route.page) || 1), pageCount);
  const visible = entries.slice((current - 1) * pageSize, current * pageSize);
  const pageHref = (page: number) => page === 1 ? getCategoryPath(category, graph) : `${getCategoryPath(category, graph)}page/${page}/`;
  const renderCard = (entry: any) => { const owner = graph.collectionDefinitions.find((definition: any) => definition.id === entry.collectionId); return <article className="overflow-hidden rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] shadow-[var(--site-card-shadow)]" key={entry.id}>{entryImage(entry) && <img className="aspect-[4/3] w-full object-cover" src={entryImage(entry)} alt={entry.title} loading="lazy" />}<div className="p-5"><h2 className="font-[var(--font-heading)] text-xl font-extrabold leading-tight text-[var(--site-heading)]"><a className="text-inherit no-underline hover:text-[var(--site-primary)]" href={getEntryPath(entry, owner, graph)}>{entry.title}</a></h2>{entry.excerpt && <p className="mt-3 line-clamp-3 leading-7 text-[var(--site-muted)]">{entry.excerpt}</p>}</div></article>; };
  return <section className="mx-auto w-full max-w-[var(--site-container-width)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]"><header className="border-b border-[var(--site-border)] pb-10 sm:pb-14"><nav className="mb-8 flex gap-2 text-sm text-[var(--site-muted)]" aria-label="Breadcrumb"><a className="font-semibold text-inherit" href={homePath}>{messages.home}</a><span>/</span><span>{category.name}</span></nav><div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">Explore by topic</p><h1 className="mt-4 font-[var(--font-heading)] text-[clamp(3rem,9vw,8rem)] font-[var(--site-heading-weight)] leading-[0.9] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{category.name}</h1></div><div>{category.description && <p className="text-lg leading-8 text-[var(--site-muted)]">{category.description}</p>}<div className="mt-4 text-sm font-bold text-[var(--site-muted)]"><span className="rounded-full border border-[var(--site-border)] px-3 py-1.5">{entries.length} {entries.length === 1 ? "story" : "stories"}</span></div></div></div>{childCategories.length > 0 && <nav className="mt-8 flex snap-x gap-3 overflow-x-auto pb-2" aria-label={`${category.name} topics`}>{childCategories.map((child: any) => <a className="shrink-0 snap-start rounded-full border border-[var(--site-border)] px-4 py-2 text-sm font-bold text-[var(--site-text)] no-underline hover:border-[var(--site-primary)] hover:text-[var(--site-primary)]" href={getCategoryPath(child, graph)} key={child.id}>{child.name}</a>)}</nav>}</header>{visible.length > 0 && <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{visible.map(renderCard)}</div>}{pageCount > 1 && <nav className="mt-12 flex items-center justify-between border-t border-[var(--site-border)] pt-6 text-sm font-bold" aria-label="Archive pagination">{current > 1 ? <a className="rounded-[var(--site-button-radius)] border border-[var(--site-border)] px-4 py-2 text-[var(--site-text)]" href={pageHref(current - 1)}>Previous</a> : <span />}<span>{messages.page} {current} of {pageCount}</span>{current < pageCount ? <a className="rounded-[var(--site-button-radius)] border border-[var(--site-border)] px-4 py-2 text-[var(--site-text)]" href={pageHref(current + 1)}>Next</a> : <span />}</nav>}{entries.length === 0 && <div className="rounded-[var(--site-card-radius)] border border-dashed border-[var(--site-border)] bg-[var(--site-surface-soft)] p-10 text-center text-[var(--site-muted)]">No published entries are assigned to this category yet.</div>}</section>;
}

export function TemplateRenderer({ route }: { route: any }) {
  const id = route.routeType === "page" ? resolvePageTemplateId(route.subject) : route.routeType === "entry" ? resolveEntryTemplateId(route.subject, route.collection) : route.routeType === "collection" ? resolveCollectionTemplateId(route.subject) : resolveCategoryTemplateId(route.subject);
  if (id === "article-standard") return <Article route={route} />;
  if (id === "author-profile") return <AuthorProfile route={route} />;
  if (id === "blog-index") return <BlogIndex route={route} />;
  if (id === "category-index") return <CategoryIndex route={route} />;
  return <LandingPage route={route} />;
}
