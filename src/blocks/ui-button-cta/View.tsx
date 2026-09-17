import { ButtonLink } from "../../ui";

export function UiButtonCtaView({ content }: { content: any }) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          {content.eyebrow && (
            <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--site-primary,#6d5dfc)]">
              {content.eyebrow}
            </p>
          )}
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{content.title}</h2>
          {content.body && <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">{content.body}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          {content.primaryText && (
            <ButtonLink href={content.primaryHref || "#"}>{content.primaryText}</ButtonLink>
          )}
          {content.secondaryText && (
            <ButtonLink href={content.secondaryHref || "#"} variant="secondary">
              {content.secondaryText}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
