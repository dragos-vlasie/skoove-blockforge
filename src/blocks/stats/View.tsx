import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function StatsView({ content }: { content: any }) {
  const presentation = ["theme", "inverse", "cards", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";
  const inverse = presentation === "theme" || presentation === "inverse";

  return (
    <section className={inverse ? ui.sectionInverse : presentation === "minimal" ? ui.sectionCompact : ui.section} data-presentation={presentation}>
      <div className={ui.container}>
        {(content.eyebrow || content.title) && (
          <div className="mb-10 max-w-3xl">
            {content.eyebrow && <p className={inverse ? "m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-accent)]" : ui.eyebrow}>{content.eyebrow}</p>}
            {content.title && <h2 className={cx(ui.heading, inverse && "text-[var(--site-on-inverse)]")}>{content.title}</h2>}
          </div>
        )}
        <div className={cx(
          "grid sm:grid-cols-2 lg:grid-cols-4",
          presentation === "cards"
            ? "gap-4"
            : "gap-px overflow-hidden border border-[var(--site-border)] bg-[var(--site-border)]",
        )}>
          {(content.items ?? []).map((stat: any, index: number) => (
            <div
              key={index}
              className={cx(
                "p-7 sm:p-9",
                inverse ? "bg-[var(--site-inverse)]" : "bg-[var(--site-background)]",
                presentation === "cards" && "rounded-[var(--site-card-radius)] border border-[var(--site-border)] shadow-[var(--site-card-shadow)]",
              )}
              data-stat-index={index}
            >
              <div className="font-[var(--font-heading)] text-4xl font-extrabold tracking-tight sm:text-5xl">{stat.value}</div>
              <div className={cx(
                "mt-2 text-xs font-extrabold uppercase tracking-[0.14em]",
                inverse ? "text-[color-mix(in_srgb,var(--site-on-inverse)_72%,transparent)]" : "text-[var(--site-muted)]",
              )}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
