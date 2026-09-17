import { PreviewField } from "../../../../cms/fieldHighlight";
import { getTravelImageProps } from "../../imageProps";

export interface VietContactCtaContent {
  eyebrow?: string;
  title: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  backgroundImage?: string;
  backgroundImageAlt?: string;
}

export function VietContactCtaView({ content }: { content: VietContactCtaContent }) {
  return (
    <section className="relative w-full min-w-0 overflow-hidden bg-[var(--site-inverse)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-on-inverse)]">
      {content.backgroundImage && (
        <PreviewField
          as="img"
          path={["backgroundImage", "backgroundImageAlt"]}
          className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity"
          {...getTravelImageProps(content.backgroundImage, { sizes: "100vw" })}
          alt={content.backgroundImageAlt || ""}
        />
      )}
      <div className="relative mx-auto flex w-full max-w-[var(--site-container-width)] flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          {content.eyebrow && <PreviewField as="p" path="eyebrow" className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-accent)]">{content.eyebrow}</PreviewField>}
          <PreviewField as="h2" path="title" className="mt-3 max-w-4xl font-[var(--font-heading)] text-[clamp(2rem,4vw,4rem)] font-[var(--site-heading-weight)] leading-[var(--site-heading-line-height)] tracking-[var(--site-heading-tracking)] text-[var(--site-on-inverse)]">{content.title}</PreviewField>
          {content.body && <PreviewField as="p" path="body" className="mt-5 max-w-2xl text-lg leading-8 text-[color-mix(in_srgb,var(--site-on-inverse)_78%,transparent)]">{content.body}</PreviewField>}
        </div>
        <nav className="flex shrink-0 flex-wrap gap-3" aria-label="Contact options">
          {content.primaryLabel && <PreviewField as="a" path={["primaryLabel", "primaryHref"]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] bg-[var(--site-primary)] px-5 py-3 font-extrabold text-[var(--site-on-primary)] no-underline" href={content.primaryHref || "#"}>{content.primaryLabel}</PreviewField>}
          {content.secondaryLabel && <PreviewField as="a" path={["secondaryLabel", "secondaryHref"]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] border border-[color-mix(in_srgb,var(--site-on-inverse)_40%,transparent)] px-5 py-3 font-extrabold text-[var(--site-on-inverse)] no-underline" href={content.secondaryHref || "#"}>{content.secondaryLabel}</PreviewField>}
        </nav>
      </div>
    </section>
  );
}
