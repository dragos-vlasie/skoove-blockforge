"use client";

import { PreviewField, usePreviewField } from "../../../../cms/fieldHighlight";
import { getTravelImageProps } from "../../imageProps";

export interface VietTourCatalogueEntry {
  id: string;
  title: string;
  href?: string;
  image?: string;
  imageAlt?: string;
  eyebrow?: string;
  summary?: string;
  duration?: string;
  route?: string;
  price?: string;
  badge?: string;
}

export interface VietTourCatalogueNavigationLink {
  id?: string;
  label: string;
  href: string;
}

export interface VietTourCatalogueContent {
  sectionId?: string;
  collectionId?: string;
  locale?: string;
  currency?: string;
  contactPriceLabel?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  emptyMessage?: string;
  durationLabel?: string;
  routeLabel?: string;
  priceLabel?: string;
  detailLabel?: string;
  navigationLinks?: VietTourCatalogueNavigationLink[];
}

export function VietTourCatalogueView({
  content,
  entries = [],
  onEntrySelect,
}: {
  content: VietTourCatalogueContent;
  entries?: VietTourCatalogueEntry[];
  onEntrySelect?: (entryId: string) => void;
}) {
  const selectEntry = (event: { preventDefault: () => void; stopPropagation: () => void }, entryId: string) => {
    if (!onEntrySelect) return;
    event.preventDefault();
    event.stopPropagation();
    onEntrySelect(entryId);
  };

  const navigationLinks = content.navigationLinks || [];
  const sectionFieldProps = usePreviewField("sectionId");

  return <section {...sectionFieldProps} id={content.sectionId || undefined} className="w-full min-w-0 scroll-mt-24 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-text)]">
    <div className="mx-auto w-full max-w-[var(--site-container-width)]">
      {navigationLinks.length > 0 && <nav aria-label="Journey groups" className="mb-12 flex flex-wrap gap-2 border-y border-[color:var(--site-border)] py-5">
        {navigationLinks.map((link, index) => <PreviewField as="a" path={[`navigationLinks.${index}.id`, `navigationLinks.${index}.label`, `navigationLinks.${index}.href`]} className="rounded-[var(--site-radius-sm)] border border-[color:var(--site-border)] bg-[var(--site-surface)] px-4 py-2 text-xs font-black text-[var(--site-primary)] no-underline transition hover:border-[color:var(--site-accent)] hover:text-[var(--site-accent)]" href={link.href} key={link.id || `${link.href}-${index}`}>{link.label}</PreviewField>)}
      </nav>}

      <header className="mb-9 max-w-3xl">
        {content.eyebrow && <PreviewField as="p" path="eyebrow" className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-primary)]">{content.eyebrow}</PreviewField>}
        {content.title && <PreviewField as="h2" path="title" className="m-0 mt-4 max-w-[18ch] font-[var(--font-heading)] text-[length:var(--site-heading-size)] font-[var(--site-heading-weight)] leading-[var(--site-heading-leading)] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{content.title}</PreviewField>}
        {content.body && <PreviewField as="p" path="body" className="m-0 mt-5 max-w-[65ch] text-lg leading-8 text-[var(--site-muted)]">{content.body}</PreviewField>}
      </header>

      {entries.length ? <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
        {entries.map((tour) => <article className={`group border-t-2 border-[color:var(--site-text)] pt-3 ${onEntrySelect ? "cursor-pointer" : ""}`} data-entry-id={tour.id} key={tour.id} onClick={(event) => selectEntry(event, tour.id)}>
          {tour.image && <a className="relative block aspect-[4/3] overflow-hidden rounded-[var(--site-media-radius)] bg-[var(--site-surface-strong)] shadow-[var(--site-media-shadow)]" href={tour.href || undefined}>
            <img
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              {...getTravelImageProps(tour.image, {
                sizes: "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw",
              })}
              alt={tour.imageAlt || ""}
            />
            {tour.badge && <span className="absolute left-3 top-3 rounded-[var(--site-radius-sm)] bg-[var(--site-accent)] px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[var(--site-on-accent)]">{tour.badge}</span>}
          </a>}
          <div className="pt-5">
            {tour.eyebrow && <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--site-primary)]">{tour.eyebrow}</p>}
            <h3 className="mt-2 text-3xl leading-tight">{tour.href ? <a className="text-[var(--site-text)] decoration-[var(--site-accent)] underline-offset-4" href={tour.href}>{tour.title}</a> : tour.title}</h3>
            {tour.summary && <p className="mt-3 line-clamp-3 leading-7 text-[var(--site-muted)]">{tour.summary}</p>}
            <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[color:var(--site-border)] py-4 text-sm">
              {tour.duration && <div><PreviewField as="dt" path="durationLabel" className="text-[var(--site-muted)]">{content.durationLabel || "Duration"}</PreviewField><dd className="m-0 font-bold">{tour.duration}</dd></div>}
              {tour.route && <div><PreviewField as="dt" path="routeLabel" className="text-[var(--site-muted)]">{content.routeLabel || "Transport"}</PreviewField><dd className="m-0 font-bold">{tour.route}</dd></div>}
            </dl>
            <p className="mt-5 flex items-end justify-between gap-3">
              <span><PreviewField as="small" path="priceLabel" className="block text-[var(--site-muted)]">{content.priceLabel || "From"}</PreviewField><strong className="text-2xl">{tour.price || content.contactPriceLabel || "Contact us"}</strong></span>
              {tour.href && <PreviewField as="a" path="detailLabel" className="font-black text-[var(--site-accent)]" href={tour.href}>{content.detailLabel || "Details"} →</PreviewField>}
            </p>
          </div>
        </article>)}
      </div> : <PreviewField as="p" path="emptyMessage" className="border border-dashed border-[color:var(--site-border)] p-8 text-[var(--site-muted)]">{content.emptyMessage || "No tours have been published yet."}</PreviewField>}
    </div>
  </section>;
}
