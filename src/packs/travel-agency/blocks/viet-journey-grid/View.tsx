import { PreviewField } from "../../../../cms/fieldHighlight";
import { getTravelImageProps } from "../../imageProps";

export interface VietJourneyCategory {
  title: string;
  eyebrow?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  href?: string;
}

export interface VietJourneyGridContent {
  title?: string;
  emptyMessage?: string;
  items?: VietJourneyCategory[];
}

export function VietJourneyGridView({ content }: { content: VietJourneyGridContent }) {
  const items = content.items || [];

  return (
    <section className="w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-text)]">
      <div className="mx-auto w-full max-w-[var(--site-container-width)]">
        {content.title && (
          <PreviewField as="h2" path="title" className="mb-8 font-[var(--font-heading)] text-[clamp(2rem,4vw,4rem)] font-[var(--site-heading-weight)] leading-[var(--site-heading-line-height)] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">
            {content.title}
          </PreviewField>
        )}
        {items.length ? (
          <div className="grid gap-px bg-[var(--site-border)] sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const itemPath = `items.${index}`;

              return (
                <article className="group relative min-h-96 overflow-hidden bg-[var(--site-surface-strong)]" key={`${item.title}-${index}`}>
                  {item.image ? (
                    <PreviewField
                      as="img"
                      path={[`${itemPath}.image`, `${itemPath}.imageAlt`]}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      {...getTravelImageProps(item.image, {
                        sizes: "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw",
                      })}
                      alt={item.imageAlt || ""}
                    />
                  ) : (
                    <span className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--site-primary)_28%,var(--site-surface)),var(--site-inverse))]" aria-hidden="true" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--site-inverse)] via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-[var(--site-on-inverse)]">
                    {item.eyebrow && (
                      <PreviewField as="p" path={`${itemPath}.eyebrow`} className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--site-accent)]">
                        {item.eyebrow}
                      </PreviewField>
                    )}
                    <PreviewField
                      as="h3"
                      path={[`${itemPath}.title`, `${itemPath}.href`]}
                      className="mt-2 text-3xl"
                    >
                      {item.href ? (
                        <a className="text-[var(--site-on-inverse)] no-underline after:absolute after:inset-0" href={item.href}>
                          {item.title}
                        </a>
                      ) : item.title}
                    </PreviewField>
                    {item.description && (
                      <PreviewField as="p" path={`${itemPath}.description`} className="mt-3 leading-6 text-[var(--site-on-inverse)] opacity-80">
                        {item.description}
                      </PreviewField>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <PreviewField as="p" path="emptyMessage" className="border border-dashed border-[color:var(--site-border)] p-8 text-[var(--site-muted)]">
            {content.emptyMessage || "No journey categories have been added yet."}
          </PreviewField>
        )}
      </div>
    </section>
  );
}
