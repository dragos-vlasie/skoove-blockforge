import { PreviewField } from "../../../../cms/fieldHighlight";
import { getTravelImageProps } from "../../imageProps";

export interface VietTourStoryContent {
  eyebrow?: string;
  title: string;
  body?: string;
  image?: string;
  imageAlt?: string;
  caption?: string;
  imageSide?: "left" | "right";
}

export function VietTourStoryView({ content }: { content: VietTourStoryContent }) {
  const copy = (
    <div className="flex flex-col justify-center px-[var(--site-gutter)] py-[var(--site-section-space-compact)]">
      {content.eyebrow && <PreviewField as="p" path="eyebrow" className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">{content.eyebrow}</PreviewField>}
      <PreviewField as="h2" path={["title", "imageSide"]} className="mt-3 font-[var(--font-heading)] text-[clamp(2rem,4vw,4rem)] font-[var(--site-heading-weight)] leading-[var(--site-heading-line-height)] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{content.title}</PreviewField>
      {content.body && <PreviewField as="div" path="body" className="mt-5 whitespace-pre-line text-lg leading-8 text-[var(--site-muted)]">{content.body}</PreviewField>}
    </div>
  );
  const image = (
    <figure className="m-0 overflow-hidden rounded-[var(--site-media-radius)] bg-[var(--site-surface-strong)] shadow-[var(--site-media-shadow)]">
      {content.image ? (
        <PreviewField as="img" path={["image", "imageAlt"]} className="h-full min-h-96 w-full object-cover" {...getTravelImageProps(content.image, { sizes: "(max-width: 1023px) 100vw, 50vw" })} alt={content.imageAlt || ""} />
      ) : (
        <PreviewField as="div" path="image" className="grid min-h-96 place-items-center text-sm font-bold text-[var(--site-muted)]">Add a story image</PreviewField>
      )}
      {content.caption && <PreviewField as="figcaption" path="caption" className="bg-[var(--site-inverse)] px-4 py-3 text-xs text-[var(--site-on-inverse)]">{content.caption}</PreviewField>}
    </figure>
  );

  return (
    <section className="w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]">
      <div className="mx-auto grid w-full max-w-[var(--site-container-width)] lg:grid-cols-2">
        {content.imageSide === "right" ? <>{copy}{image}</> : <>{image}{copy}</>}
      </div>
    </section>
  );
}
