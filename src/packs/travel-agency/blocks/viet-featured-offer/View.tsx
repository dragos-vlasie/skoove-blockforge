import { PreviewField } from "../../../../cms/fieldHighlight";
import { getTravelImageProps } from "../../imageProps";

export interface VietFeaturedOfferContent {
  eyebrow?: string;
  title: string;
  summary?: string;
  image?: string;
  imageAlt?: string;
  priceLabel?: string;
  price?: string;
  oldPrice?: string;
  facts?: Array<{ label: string; value: string }>;
  ctaLabel?: string;
  ctaHref?: string;
}

export function VietFeaturedOfferView({ content }: { content: VietFeaturedOfferContent }) {
  return (
    <section className="w-full min-w-0 overflow-hidden bg-[var(--site-inverse)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-on-inverse)]">
      <article className="mx-auto grid w-full max-w-[var(--site-container-width)] overflow-hidden rounded-[var(--site-card-radius)] border border-current/15 shadow-[var(--site-card-shadow)] lg:grid-cols-[1.15fr_.85fr]">
        {content.image && <PreviewField as="img" path={["image", "imageAlt"]} className="h-full min-h-80 w-full object-cover" {...getTravelImageProps(content.image, { sizes: "(max-width: 1023px) 100vw, 58vw" })} alt={content.imageAlt || ""} />}
        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
          {content.eyebrow && <PreviewField as="p" path="eyebrow" className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-accent)]">{content.eyebrow}</PreviewField>}
          <PreviewField as="h2" path="title" className="mt-3 font-[var(--font-heading)] text-[clamp(2rem,4vw,4rem)] font-[var(--site-heading-weight)] leading-[var(--site-heading-line-height)] tracking-[var(--site-heading-tracking)] text-[var(--site-on-inverse)]">{content.title}</PreviewField>
          {content.summary && <PreviewField as="p" path="summary" className="mt-5 text-lg leading-8 text-[color-mix(in_srgb,var(--site-on-inverse)_75%,transparent)]">{content.summary}</PreviewField>}
          {content.facts?.length ? (
            <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-current/15 py-5">
              {content.facts.map((fact, index) => (
                <div key={`${fact.label}-${index}`}>
                  <PreviewField as="dt" path={`facts.${index}.label`} className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--site-on-inverse)] opacity-65">{fact.label}</PreviewField>
                  <PreviewField as="dd" path={`facts.${index}.value`} className="mt-1 font-bold">{fact.value}</PreviewField>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
            <p className="m-0">
              <PreviewField as="small" path="priceLabel" className="block uppercase tracking-[.12em] text-[var(--site-on-inverse)] opacity-65">{content.priceLabel || "From"}</PreviewField>
              {content.oldPrice && <PreviewField as="del" path="oldPrice" className="mr-2 text-[var(--site-on-inverse)] opacity-65">{content.oldPrice}</PreviewField>}
              <PreviewField as="strong" path="price" className="text-3xl text-[var(--site-on-inverse)]">{content.price || "Contact us"}</PreviewField>
            </p>
            {content.ctaLabel && <PreviewField as="a" path={["ctaLabel", "ctaHref"]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] bg-[var(--site-primary)] px-5 py-3 font-extrabold text-[var(--site-on-primary)] no-underline" href={content.ctaHref || "#"}>{content.ctaLabel}</PreviewField>}
          </div>
        </div>
      </article>
    </section>
  );
}
