import { PreviewField } from "../../../../cms/fieldHighlight";

export interface VietDepartureItem {
  id?: string;
  date: string;
  duration?: string;
  price?: string;
  status?: string;
  note?: string;
}

export interface VietDepartureScheduleContent {
  eyebrow?: string;
  title?: string;
  introduction?: string;
  emptyMessage?: string;
  dateLabel?: string;
  durationLabel?: string;
  priceLabel?: string;
  statusLabel?: string;
  noteLabel?: string;
  departures?: VietDepartureItem[];
}

export function VietDepartureScheduleView({ content }: { content: VietDepartureScheduleContent }) {
  const departures = content.departures || [];

  return (
    <section className="w-full min-w-0 overflow-hidden bg-[var(--site-surface-soft)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-text)]">
      <div className="mx-auto w-full max-w-[var(--site-container-width)]">
        <header className="max-w-3xl">
          {content.eyebrow && <PreviewField as="p" path="eyebrow" className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">{content.eyebrow}</PreviewField>}
          <PreviewField as="h2" path="title" className="mt-3 font-[var(--font-heading)] text-[clamp(2rem,4vw,4rem)] font-[var(--site-heading-weight)] leading-[var(--site-heading-line-height)] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{content.title || "Departure schedule"}</PreviewField>
          {content.introduction && <PreviewField as="p" path="introduction" className="mt-5 max-w-3xl text-lg leading-8 text-[var(--site-muted)]">{content.introduction}</PreviewField>}
        </header>
        {departures.length ? (
          <>
          <div className="mt-8 hidden overflow-x-auto border-t-2 border-[color:var(--site-text)] md:block">
            <table className="min-w-[44rem] w-full border-collapse text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--site-muted)]">
                  <PreviewField as="th" path="dateLabel" className="border-b border-[color:var(--site-border)] px-3 py-4">{content.dateLabel || "Departure date"}</PreviewField>
                  <PreviewField as="th" path="durationLabel" className="border-b border-[color:var(--site-border)] px-3 py-4">{content.durationLabel || "Duration"}</PreviewField>
                  <PreviewField as="th" path="priceLabel" className="border-b border-[color:var(--site-border)] px-3 py-4">{content.priceLabel || "Package price"}</PreviewField>
                  <PreviewField as="th" path="statusLabel" className="border-b border-[color:var(--site-border)] px-3 py-4">{content.statusLabel || "Availability"}</PreviewField>
                  <PreviewField as="th" path="noteLabel" className="border-b border-[color:var(--site-border)] px-3 py-4">{content.noteLabel || "Notes"}</PreviewField>
                </tr>
              </thead>
              <tbody>
                {departures.map((departure, index) => {
                  const itemPath = `departures.${index}`;
                  return (
                    <tr data-entry-id={departure.id} key={departure.id || `${departure.date}-${index}`}>
                      <PreviewField as="td" path={[`${itemPath}.id`, `${itemPath}.date`]} className="border-b border-[color:var(--site-border)] px-3 py-5 text-xl">{departure.date}</PreviewField>
                      <PreviewField as="td" path={`${itemPath}.duration`} className="border-b border-[color:var(--site-border)] px-3 py-5">{departure.duration || "—"}</PreviewField>
                      <PreviewField as="td" path={`${itemPath}.price`} className="border-b border-[color:var(--site-border)] px-3 py-5 font-black text-[var(--site-primary)]">{departure.price || "Contact us"}</PreviewField>
                      <PreviewField as="td" path={`${itemPath}.status`} className="border-b border-[color:var(--site-border)] px-3 py-5"><span className="rounded-[var(--site-radius-sm)] bg-[var(--site-surface)] px-3 py-1 text-xs font-bold">{departure.status || "Available"}</span></PreviewField>
                      <PreviewField as="td" path={`${itemPath}.note`} className="border-b border-[color:var(--site-border)] px-3 py-5 text-[var(--site-muted)]">{departure.note || "—"}</PreviewField>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-8 grid gap-4 md:hidden">
            {departures.map((departure, index) => {
              const itemPath = `departures.${index}`;
              const details = [
                { label: content.dateLabel || "Departure date", labelPath: "dateLabel", value: departure.date, valuePath: `${itemPath}.date` },
                { label: content.durationLabel || "Duration", labelPath: "durationLabel", value: departure.duration || "—", valuePath: `${itemPath}.duration` },
                { label: content.priceLabel || "Package price", labelPath: "priceLabel", value: departure.price || "Contact us", valuePath: `${itemPath}.price`, strong: true },
                { label: content.statusLabel || "Availability", labelPath: "statusLabel", value: departure.status || "Available", valuePath: `${itemPath}.status` },
                { label: content.noteLabel || "Notes", labelPath: "noteLabel", value: departure.note || "—", valuePath: `${itemPath}.note` },
              ];
              return (
                <article className="overflow-hidden rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-background)] shadow-[var(--site-card-shadow)]" data-entry-id={departure.id} key={departure.id || `${departure.date}-${index}`}>
                  <dl className="m-0">
                    {details.map((detail) => (
                      <div className="grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] gap-3 border-b border-[var(--site-border)] px-4 py-3 last:border-0" key={detail.valuePath}>
                        <PreviewField as="dt" path={detail.labelPath} className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--site-muted)]">{detail.label}</PreviewField>
                        <PreviewField as="dd" path={detail.valuePath} className={detail.strong ? "m-0 break-words font-black text-[var(--site-primary)]" : "m-0 break-words text-[var(--site-text)]"}>{detail.value}</PreviewField>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
          </>
        ) : (
          <PreviewField as="p" path="emptyMessage" className="mt-8 border border-dashed border-[color:var(--site-border)] p-8 text-[var(--site-muted)]">
            {content.emptyMessage || "Departure dates are being updated."}
          </PreviewField>
        )}
      </div>
    </section>
  );
}
