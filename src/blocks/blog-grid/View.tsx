import type { ContentGraph } from "../../../types";
import type { MouseEvent } from "react";
import { cx, publicStyles as ui } from "../../styles/publicStyles";
import { getPaginationItems, resolveBlogGridListing, type BlogGridListing } from "./listing";

const cardImage = "h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]";
const eyebrow = "text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-primary)]";
const title = "font-[var(--font-heading)] font-extrabold leading-[1.05] tracking-tight text-[var(--site-heading)]";
const cardBase = "group min-w-0 overflow-hidden rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] text-[var(--site-heading)] no-underline shadow-[var(--site-card-shadow)] transition hover:-translate-y-0.5 hover:shadow-[var(--site-media-shadow)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--site-primary)]";
const paginationButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--site-button-radius)] border border-[var(--site-border)] px-4 py-2 text-sm font-extrabold text-[var(--site-text)] no-underline transition hover:border-[var(--site-primary)] hover:text-[var(--site-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-primary)] aria-disabled:pointer-events-none aria-disabled:opacity-40";

export function BlogGridView({
  content,
  graph,
  page = 1,
  path = "/",
  resolvedListing,
  onPageChange,
}: {
  content: any;
  graph?: ContentGraph;
  page?: number;
  path?: string;
  resolvedListing?: BlogGridListing;
  onPageChange?: (page: number) => void;
}) {
  const listing = resolvedListing ?? resolveBlogGridListing(content, graph, Number(page) || 1);
  const posts = listing.posts.length ? listing.posts : Array.isArray(content.posts) ? content.posts : [];
  const HeadingTag = content.headingLevel === "h1" ? "h1" : "h2";
  const isSkoove = graph?.site?.siteName === "Skoove Blog";
  const SectionHeadingTag = isSkoove ? "h1" : HeadingTag;
  const layout = ["editorial", "cards", "compact", "portal-mosaic", "lead-mosaic", "publication-feed", "story-lane", "portrait-grid", "numbered-list", "popular-featured"].includes(content.layout)
    ? content.layout
    : "editorial";
  const isStoryLane = layout === "story-lane";
  const isPopularFeatured = layout === "popular-featured";
  const isPublicationFeed = layout === "publication-feed";
  const isOverlayGrid = layout === "portal-mosaic" || layout === "lead-mosaic";
  const isNumbered = layout === "numbered-list";
  const headingId = content.title ? `blog-grid-${String(content.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}` : undefined;
  const paginationBasePath = content.paginationBasePath || path.replace(/page\/\d+\/$/, "") || "/";
  const normalizedPaginationBase = paginationBasePath.endsWith("/") ? paginationBasePath : `${paginationBasePath}/`;
  const pageHref = (targetPage: number) => targetPage === 1 ? normalizedPaginationBase : `${normalizedPaginationBase}page/${targetPage}/`;
  const selectPage = (event: MouseEvent<HTMLAnchorElement>, targetPage: number) => {
    if (!onPageChange) return;
    event.preventDefault();
    onPageChange(targetPage);
  };

  const standardCard = (post: any, index: number) => (
    <a
      key={post.id || index}
      href={post.href || "#"}
      className={cx(
        isSkoove ? "group min-w-0 bg-white text-[#103133] no-underline" : cardBase,
        isStoryLane && "w-[min(78vw,24rem)] shrink-0 snap-start border-0 bg-transparent shadow-none hover:translate-y-0 hover:shadow-none",
        layout === "portrait-grid" && "border-0 bg-transparent shadow-none hover:translate-y-0 hover:shadow-none",
        isOverlayGrid && "relative min-h-[22rem] border-0 bg-[var(--site-inverse)] text-[var(--site-on-inverse)]",
        isNumbered && "grid grid-cols-[3rem_6rem_minmax(0,1fr)] items-center gap-4 border-x-0 border-t-0 bg-transparent py-6 shadow-none hover:translate-y-0 hover:shadow-none sm:grid-cols-[4rem_9rem_minmax(0,1fr)]",
      )}
    >
      {isNumbered && <span className="text-center font-[var(--font-heading)] text-2xl text-[var(--site-accent)]">{String(index + 1).padStart(2, "0")}</span>}
      {post.image && (
        <figure className={cx("m-0 overflow-hidden bg-[var(--site-surface-strong)]", isNumbered ? "aspect-square rounded-[var(--site-media-radius)]" : isSkoove ? "aspect-[1.214/1]" : "aspect-[4/3]", (isStoryLane || layout === "portrait-grid") && "aspect-[4/5] rounded-[var(--site-media-radius)]", isOverlayGrid && "absolute inset-0 h-full")}>
          <img src={post.image} alt={post.imageAlt || post.title || ""} loading="lazy" decoding="async" className={cardImage} style={{ objectPosition: post.imagePosition || "center" }} />
          {isOverlayGrid && <span className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--site-inverse)_92%,transparent)] via-[color-mix(in_srgb,var(--site-inverse)_20%,transparent)] to-transparent" aria-hidden="true" />}
        </figure>
      )}
      <div className={cx("p-5", isStoryLane && "px-0 pb-0", layout === "portrait-grid" && "px-0 pb-0", isOverlayGrid && "absolute inset-x-0 bottom-0 z-10 p-6 sm:p-8", isNumbered && "p-0")}>
        <span className={cx(eyebrow, isOverlayGrid && "text-[var(--site-on-inverse)]")}>{post.category || "Story"}</span>
        <h3 className={cx(title, "mt-3 text-xl sm:text-2xl", isOverlayGrid && "text-[var(--site-on-inverse)] sm:text-3xl", isNumbered && "text-lg sm:text-2xl")}>{post.title}</h3>
        {!isOverlayGrid && !isNumbered && content.showExcerpt !== false && post.excerpt && <p className="mt-3 line-clamp-3 leading-7 text-[var(--site-muted)]">{post.excerpt}</p>}
        {!isOverlayGrid && content.showDate !== false && post.date && <time className="mt-4 block text-sm text-[var(--site-muted)]" dateTime={post.date}>{new Date(post.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</time>}
      </div>
    </a>
  );

  return (
    <section className={isSkoove ? "w-full bg-[#f5f5f5] px-5 pb-8 pt-12 text-[#103133] sm:px-8" : ui.section} data-layout={layout} aria-labelledby={headingId}>
      <div className={isSkoove ? "mx-auto w-full max-w-[69rem]" : ui.container}>
        {(content.eyebrow || content.title || content.subtitle || (isStoryLane && posts.length > 1)) && (
          <header className={isSkoove ? "mb-10 flex flex-wrap items-end justify-between gap-6" : "mb-8 flex flex-wrap items-end justify-between gap-6 sm:mb-10"} data-blog-grid-heading>
            <div className="max-w-4xl">
              {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
              {content.title && <SectionHeadingTag className={ui.heading} id={headingId}>{content.title}</SectionHeadingTag>}
              {content.subtitle && <p className={ui.copy}>{content.subtitle}</p>}
            </div>
            {isStoryLane && posts.length > 1 && <div className="flex gap-2" aria-label="Story carousel controls"><button className={paginationButton} type="button" data-carousel-previous aria-label="Show previous stories">←</button><button className={paginationButton} type="button" data-carousel-next aria-label="Show next stories">→</button></div>}
          </header>
        )}

        {isPopularFeatured ? (
          <ol className="m-0 grid list-none gap-0 overflow-hidden border-y border-[var(--site-border)] p-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]" data-blog-grid-items>
            {posts.map((post: any, index: number) => {
              const categories = Array.isArray(post.categories) && post.categories.length ? post.categories : [post.category || "Story"];
              return <li className={cx("border-b border-[var(--site-border)] py-5 last:border-0 lg:col-start-2 lg:px-6", index === 0 && "lg:row-span-5 lg:col-start-1 lg:border-b-0 lg:border-r lg:px-0 lg:py-0")} key={post.id || index}><a className={cx("group grid items-center gap-4 text-[var(--site-heading)] no-underline focus-visible:outline-2 focus-visible:outline-[var(--site-primary)]", index === 0 ? "h-full content-start lg:block" : "grid-cols-[5.5rem_minmax(0,1fr)]")} href={post.href || "#"}>{post.image && <figure className={cx("m-0 aspect-square overflow-hidden rounded-[var(--site-media-radius)]", index === 0 && "aspect-[4/3] rounded-none lg:h-full lg:min-h-[34rem]")}><img className={cardImage} src={post.image} alt={post.imageAlt || post.title || ""} loading="lazy" /></figure>}<div className={cx(index === 0 && "p-6 lg:absolute lg:bottom-0 lg:max-w-xl lg:bg-[color-mix(in_srgb,var(--site-background)_92%,transparent)]")}><div className="flex flex-wrap gap-2">{categories.map((category: string) => <span className={eyebrow} key={category}>{category}</span>)}</div><h3 className={cx(title, index === 0 ? "mt-3 text-3xl sm:text-4xl" : "mt-2 text-lg")}>{post.title}</h3></div></a></li>;
            })}
          </ol>
        ) : isPublicationFeed ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" data-blog-grid-items>
            {posts.map((post: any, index: number) => standardCard(post, index))}
          </div>
        ) : (
          <div className={cx("grid gap-6", isStoryLane ? "-mx-[var(--site-gutter)] flex snap-x snap-mandatory overflow-x-auto px-[var(--site-gutter)] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : isNumbered ? "grid-cols-1 gap-0" : isOverlayGrid ? "md:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3", layout === "portrait-grid" && "md:grid-cols-3 lg:grid-cols-4")} data-blog-grid-items data-carousel-track={isStoryLane ? "true" : undefined} aria-label={isStoryLane ? `${content.title || "Stories"} carousel` : undefined} tabIndex={isStoryLane ? 0 : undefined}>
            {posts.map((post: any, index: number) => standardCard(post, index))}
          </div>
        )}

        {listing.isPaginated && listing.totalPages > 1 && (
          <nav className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--site-border)] pt-6" aria-label="Posts pagination">
            {listing.currentPage > 1 ? <a className={paginationButton} href={pageHref(listing.currentPage - 1)} onClick={onPageChange ? (event) => selectPage(event, listing.currentPage - 1) : undefined}>← Previous</a> : <span className={paginationButton} aria-disabled="true">← Previous</span>}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {getPaginationItems(listing.currentPage, listing.totalPages).map((item, index) => item === "ellipsis" ? <span className="px-2 text-[var(--site-muted)]" aria-hidden="true" key={`ellipsis-${index}`}>…</span> : <a className={cx(paginationButton, "h-11 min-w-11 px-3", item === listing.currentPage && "border-[var(--site-primary)] bg-[var(--site-primary)] text-[var(--site-on-primary)]")} href={pageHref(item)} onClick={onPageChange ? (event) => selectPage(event, item) : undefined} aria-current={item === listing.currentPage ? "page" : undefined} aria-label={`Page ${item}`} key={item}>{item}</a>)}
            </div>
            {listing.currentPage < listing.totalPages ? <a className={paginationButton} href={pageHref(listing.currentPage + 1)} onClick={onPageChange ? (event) => selectPage(event, listing.currentPage + 1) : undefined}>Next →</a> : <span className={paginationButton} aria-disabled="true">Next →</span>}
          </nav>
        )}
      </div>
    </section>
  );
}
