"use client";

import { PreviewField, usePreviewField } from "../../../../cms/fieldHighlight";

export interface VietTourPackageDeparture {
  id?: string;
  date: string;
  price?: string;
  status?: string;
  note?: string;
}

export interface VietTourPackageLink {
  id?: string;
  label: string;
  href: string;
  meta?: string;
}

export interface VietTourPackageContent {
  sourceOfferId?: string;
  eyebrow?: string;
  title: string;
  summary?: string;
  duration?: string;
  transportLabel?: string;
  carrierName?: string;
  shoppingLabel?: string;
  badge?: string;
  priceFromLabel?: string;
  priceFrom?: string;
  durationLabel?: string;
  transportFactLabel?: string;
  carrierLabel?: string;
  shoppingFactLabel?: string;
  programmeLabel?: string;
  dateLabel?: string;
  priceLabel?: string;
  statusLabel?: string;
  noteLabel?: string;
  emptyMessage?: string;
  programmeLinks?: VietTourPackageLink[];
  departures?: VietTourPackageDeparture[];
}

export function VietTourPackageView({ content }: { content: VietTourPackageContent }) {
  const departures = content.departures || [];
  const links = content.programmeLinks || [];
  const packageFieldProps = usePreviewField("sourceOfferId");

  return <section className="w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]">
    <article {...packageFieldProps} className="mx-auto w-full max-w-[var(--site-container-width)] overflow-hidden rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] shadow-[var(--site-card-shadow)]">
      <header className="grid gap-7 border-b border-[color:var(--site-border)] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {content.eyebrow && <PreviewField as="p" path="eyebrow" className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-primary)]">{content.eyebrow}</PreviewField>}
            {content.badge && <PreviewField as="span" path="badge" className="rounded-[var(--site-radius-sm)] bg-[var(--site-accent)] px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[var(--site-on-accent)]">{content.badge}</PreviewField>}
          </div>
          <PreviewField as="h3" path="title" className="m-0 mt-4 max-w-4xl font-[var(--font-heading)] text-[length:var(--site-heading-size)] font-[var(--site-heading-weight)] leading-[var(--site-heading-leading)] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{content.title}</PreviewField>
          {content.summary && <PreviewField as="p" path="summary" className="m-0 mt-5 max-w-3xl text-lg leading-8 text-[var(--site-muted)]">{content.summary}</PreviewField>}
        </div>
        <p className="m-0 min-w-48 border-l-2 border-[color:var(--site-accent)] pl-4">
          <PreviewField as="small" path="priceFromLabel" className="block text-[10px] font-black uppercase tracking-[.14em] text-[var(--site-muted)]">{content.priceFromLabel || "From"}</PreviewField>
          <PreviewField as="strong" path="priceFrom" className="mt-1 block text-3xl text-[var(--site-primary)]">{content.priceFrom || "Contact us"}</PreviewField>
        </p>
      </header>

      <dl className="grid gap-px bg-[var(--site-border)] sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: content.durationLabel || "Duration", labelPath: "durationLabel", value: content.duration, valuePath: "duration" },
          { label: content.transportFactLabel || "Transport", labelPath: "transportFactLabel", value: content.transportLabel, valuePath: "transportLabel" },
          { label: content.carrierLabel || "Carrier", labelPath: "carrierLabel", value: content.carrierName, valuePath: "carrierName" },
          { label: content.shoppingFactLabel || "Tour format", labelPath: "shoppingFactLabel", value: content.shoppingLabel, valuePath: "shoppingLabel" },
        ].map((fact) => <div className="bg-[var(--site-surface-soft)] p-5" key={fact.labelPath}><PreviewField as="dt" path={fact.labelPath} className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--site-muted)]">{fact.label}</PreviewField><PreviewField as="dd" path={fact.valuePath} className="m-0 mt-1 font-bold">{fact.value || "To be confirmed"}</PreviewField></div>)}
      </dl>

      <div className="p-6 sm:p-8">
        {links.length > 0 && <div className="mb-7 flex flex-wrap items-center gap-3"><PreviewField as="strong" path="programmeLabel" className="mr-2 text-sm">{content.programmeLabel || "Detailed programme"}</PreviewField>{links.map((link, index) => <PreviewField as="a" path={[`programmeLinks.${index}.id`, `programmeLinks.${index}.label`, `programmeLinks.${index}.href`, `programmeLinks.${index}.meta`]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] border border-[var(--site-border)] px-5 py-3 font-extrabold text-[var(--site-text)] no-underline transition hover:border-[var(--site-primary)] hover:text-[var(--site-primary)]" href={link.href || "#travel-enquiry"} target={link.href ? "_blank" : undefined} rel={link.href ? "noopener noreferrer" : undefined} key={link.id || `${link.href}-${index}`}>{link.label || `Document ${index + 1}`}{link.meta ? ` · ${link.meta}` : ""}</PreviewField>)}</div>}
        {departures.length > 0 ? <>
          <div className="grid gap-3 sm:hidden">{departures.map((departure, index) => <article className="rounded-[var(--site-radius-sm)] border border-[color:var(--site-border)] bg-[var(--site-background)] p-4" key={departure.id || `${departure.date}-${index}`}>
            <PreviewField as="p" path="dateLabel" className="m-0 text-[10px] font-black uppercase tracking-[.14em] text-[var(--site-muted)]">{content.dateLabel || "Departure date"}</PreviewField>
            <PreviewField as="p" path={[`departures.${index}.id`, `departures.${index}.date`]} className="m-0 mt-1 font-bold">{departure.date}</PreviewField>
            <PreviewField as="p" path="priceLabel" className="m-0 mt-4 text-[10px] font-black uppercase tracking-[.14em] text-[var(--site-muted)]">{content.priceLabel || "Price"}</PreviewField>
            <PreviewField as="p" path={`departures.${index}.price`} className="m-0 mt-1 text-2xl font-black text-[var(--site-primary)]">{departure.price || "Contact us"}</PreviewField>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><PreviewField as="span" path={`departures.${index}.status`} className="rounded-[var(--site-radius-sm)] bg-[var(--site-surface-soft)] px-3 py-1 font-bold">{departure.status || "Available"}</PreviewField>{departure.note && <PreviewField as="span" path={`departures.${index}.note`} className="text-[var(--site-muted)]">{departure.note}</PreviewField>}</div>
          </article>)}</div>
          <div className="hidden overflow-x-auto sm:block"><table className="w-full border-collapse text-left"><thead><tr className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--site-muted)]"><PreviewField as="th" path="dateLabel" className="border-b-2 border-[color:var(--site-text)] px-3 py-3">{content.dateLabel || "Departure date"}</PreviewField><PreviewField as="th" path="priceLabel" className="border-b-2 border-[color:var(--site-text)] px-3 py-3">{content.priceLabel || "Price"}</PreviewField><PreviewField as="th" path="statusLabel" className="border-b-2 border-[color:var(--site-text)] px-3 py-3">{content.statusLabel || "Availability"}</PreviewField><PreviewField as="th" path="noteLabel" className="border-b-2 border-[color:var(--site-text)] px-3 py-3">{content.noteLabel || "Notes"}</PreviewField></tr></thead><tbody>{departures.map((departure, index) => <tr key={departure.id || `${departure.date}-${index}`}><PreviewField as="td" path={[`departures.${index}.id`, `departures.${index}.date`]} className="border-b border-[color:var(--site-border)] px-3 py-4 font-bold">{departure.date}</PreviewField><PreviewField as="td" path={`departures.${index}.price`} className="border-b border-[color:var(--site-border)] px-3 py-4 font-black text-[var(--site-primary)]">{departure.price || "Contact us"}</PreviewField><PreviewField as="td" path={`departures.${index}.status`} className="border-b border-[color:var(--site-border)] px-3 py-4"><span className="rounded-[var(--site-radius-sm)] bg-[var(--site-surface-soft)] px-3 py-1 text-xs font-bold">{departure.status || "Available"}</span></PreviewField><PreviewField as="td" path={`departures.${index}.note`} className="border-b border-[color:var(--site-border)] px-3 py-4 text-[var(--site-muted)]">{departure.note || "—"}</PreviewField></tr>)}</tbody></table></div>
        </> : <PreviewField as="p" path="emptyMessage" className="border border-dashed border-[color:var(--site-border)] p-6 text-[var(--site-muted)]">{content.emptyMessage || "Departure dates are being updated."}</PreviewField>}
      </div>
    </article>
  </section>;
}
