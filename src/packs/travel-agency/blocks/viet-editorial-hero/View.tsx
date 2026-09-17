import { PreviewField } from "../../../../cms/fieldHighlight";
import { getTravelImageProps } from "../../imageProps";

export interface VietEditorialHeroContent {
  eyebrow?: string;
  title: string;
  dek?: string;
  image?: string;
  imageAlt?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  editionLabel?: string;
  imageLabel?: string;
}

export function VietEditorialHeroView({ content }: { content: VietEditorialHeroContent }) {
  return (
    <section className="travel-editorial-hero bg-[var(--site-background)] text-[var(--site-text)]">
      <div className="mx-auto grid min-h-[42rem] w-full max-w-[var(--site-container-width)] items-stretch lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-between px-[var(--site-gutter)] py-[var(--site-section-space-compact)]">
          <div>
            <PreviewField as="p" path="eyebrow" className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">
              {content.eyebrow || "Travel with more meaning"}
            </PreviewField>
            <PreviewField as="h1" path="title" className="max-w-3xl font-[var(--font-heading)] text-[clamp(3rem,8vw,7.5rem)] font-[var(--site-heading-weight)] leading-[0.9] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">
              {content.title}
            </PreviewField>
            {content.dek && <PreviewField as="p" path="dek" className="mt-5 max-w-2xl text-lg leading-8 text-[var(--site-muted)]">{content.dek}</PreviewField>}
            <nav className="mt-9 flex flex-wrap gap-3" aria-label="Hero actions">
              {content.primaryLabel && <PreviewField as="a" path={["primaryLabel", "primaryHref"]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] bg-[var(--site-primary)] px-5 py-3 font-extrabold text-[var(--site-on-primary)] no-underline" href={content.primaryHref || "#"}>{content.primaryLabel}</PreviewField>}
              {content.secondaryLabel && <PreviewField as="a" path={["secondaryLabel", "secondaryHref"]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] border border-[var(--site-border)] px-5 py-3 font-extrabold text-[var(--site-text)] no-underline" href={content.secondaryHref || "#"}>{content.secondaryLabel}</PreviewField>}
            </nav>
          </div>
          {content.editionLabel && <PreviewField as="p" path="editionLabel" className="mt-12 border-t border-[color:var(--site-border)] pt-4 text-xs font-bold uppercase tracking-[0.16em]">{content.editionLabel}</PreviewField>}
        </div>
        <div className="relative min-h-[28rem] overflow-hidden rounded-[var(--site-media-radius)] bg-[var(--site-surface-strong)] shadow-[var(--site-media-shadow)]">
          {content.image ? (
            <PreviewField
              as="img"
              path={["image", "imageAlt"]}
              className="absolute inset-0 h-full w-full object-cover"
              {...getTravelImageProps(content.image, {
                eager: true,
                sizes: "(max-width: 1023px) 100vw, 54vw",
              })}
              alt={content.imageAlt || ""}
            />
          ) : (
            <PreviewField as="div" path="image" className="grid h-full place-items-center p-8 text-sm font-bold text-[var(--site-muted)]">Choose a lead image</PreviewField>
          )}
          {content.imageLabel && <PreviewField as="span" path="imageLabel" className="absolute bottom-5 right-5 rounded-[var(--site-radius-sm)] bg-[var(--site-surface)] px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[var(--site-text)]">{content.imageLabel}</PreviewField>}
        </div>
      </div>
    </section>
  );
}
