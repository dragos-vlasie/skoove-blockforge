import { PreviewField } from "../../../../cms/fieldHighlight";

export interface VietProgrammeLinkContent {
  label?: string;
  title: string;
  description?: string;
  href?: string;
  fileMeta?: string;
}

export function VietProgrammeLinkView({ content }: { content: VietProgrammeLinkContent }) {
  return (
    <section className="w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]">
      <a className="mx-auto flex w-full max-w-[var(--site-container-width)] flex-col justify-between gap-5 border-y-2 border-[var(--site-border)] py-6 text-[var(--site-text)] no-underline sm:flex-row sm:items-center" href={content.href || "#travel-enquiry"} target={content.href ? "_blank" : undefined} rel={content.href ? "noopener noreferrer" : undefined}>
        <span>
          {content.label && <PreviewField as="small" path="label" className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">{content.label}</PreviewField>}
          <PreviewField as="strong" path={["title", "href"]} className="mt-1 block font-[var(--site-heading-weight)] tracking-[var(--site-heading-tracking)] text-[clamp(1.75rem,3vw,2.75rem)]">{content.title}</PreviewField>
          {content.description && <PreviewField as="span" path="description" className="mt-2 block text-lg leading-8 text-[var(--site-muted)]">{content.description}</PreviewField>}
        </span>
        <span className="flex shrink-0 items-center gap-4">
          <PreviewField as="small" path="fileMeta" className="uppercase tracking-[.12em] text-[var(--site-muted)]">{content.fileMeta || "PDF · Detailed programme"}</PreviewField>
          <b className="grid h-12 w-12 place-items-center rounded-full bg-[var(--site-primary)] text-xl text-[var(--site-on-primary)]" aria-hidden="true">↓</b>
        </span>
      </a>
    </section>
  );
}
