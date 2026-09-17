import { PreviewField } from "../../../../cms/fieldHighlight";
import { getTravelImageProps } from "../../imageProps";

export interface VietTourFact {
  label: string;
  value: string;
}

export interface VietTourOverviewContent {
  eyebrow?: string;
  title: string;
  summary?: string;
  image?: string;
  imageAlt?: string;
  priceLabel?: string;
  price?: string;
  facts?: VietTourFact[];
  primaryLabel?: string;
  primaryHref?: string;
  backLabel?: string;
  backHref?: string;
}

export function VietTourOverviewView({ content }: { content: VietTourOverviewContent }) {
  return (
    <section className="w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]">
      <div className="mx-auto w-full max-w-[var(--site-container-width)]">
        {content.backLabel && <PreviewField as="a" path={["backLabel", "backHref"]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] border border-[var(--site-border)] px-5 py-3 font-extrabold text-[var(--site-text)] no-underline" href={content.backHref || "/tour/"}>← {content.backLabel}</PreviewField>}
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          {content.image && <PreviewField as="img" path={["image", "imageAlt"]} className="aspect-[4/3] h-full w-full rounded-[var(--site-media-radius)] object-cover shadow-[var(--site-media-shadow)]" {...getTravelImageProps(content.image, { eager: true, sizes: "(max-width: 1023px) 100vw, 55vw" })} alt={content.imageAlt || ""} />}
          <div>
            {content.eyebrow && <PreviewField as="p" path="eyebrow" className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">{content.eyebrow}</PreviewField>}
            <PreviewField as="h1" path="title" className="mt-3 font-[var(--font-heading)] text-[clamp(3rem,8vw,7.5rem)] font-[var(--site-heading-weight)] leading-[0.9] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{content.title}</PreviewField>
            {content.summary && <PreviewField as="p" path="summary" className="mt-5 max-w-3xl text-lg leading-8 text-[var(--site-muted)]">{content.summary}</PreviewField>}
            {content.facts?.length ? (
              <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-[color:var(--site-border)] py-5">
                {content.facts.map((fact, index) => (
                  <div key={`${fact.label}-${index}`}>
                    <PreviewField as="dt" path={`facts.${index}.label`} className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--site-muted)]">{fact.label}</PreviewField>
                    <PreviewField as="dd" path={`facts.${index}.value`} className="m-0 mt-1 font-bold">{fact.value}</PreviewField>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="mt-7 flex items-end justify-between gap-4">
              <p className="m-0">
                <PreviewField as="small" path="priceLabel" className="block text-[var(--site-muted)]">{content.priceLabel || "From"}</PreviewField>
                <PreviewField as="strong" path="price" className="text-3xl">{content.price || "Contact us"}</PreviewField>
              </p>
              {content.primaryLabel && <PreviewField as="a" path={["primaryLabel", "primaryHref"]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] bg-[var(--site-primary)] px-5 py-3 font-extrabold text-[var(--site-on-primary)] no-underline" href={content.primaryHref || "#travel-enquiry"}>{content.primaryLabel}</PreviewField>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
