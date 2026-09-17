import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function FeaturesView({ content }: { content: any }) {
  const presentation = ["theme", "numbered", "cards", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";

  return (
    <section className={ui.section} data-presentation={presentation}>
      <div className={ui.container}>
        <div className="max-w-3xl">
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          {content.title && <h2 className={ui.heading}>{content.title}</h2>}
        </div>
        <div className={cx("mt-12 grid gap-px overflow-hidden border border-[var(--site-border)] bg-[var(--site-border)] md:grid-cols-2 lg:grid-cols-3", presentation === "minimal" && "border-x-0 bg-transparent", presentation === "cards" && "gap-4 border-0 bg-transparent")}>
          {(content.items ?? []).map((item: any, index: number) => (
            <article key={index} className={cx("min-w-0 bg-[var(--site-background)] p-7 sm:p-9", presentation === "cards" && ui.card, presentation === "minimal" && "border-t border-[var(--site-border)] px-0")}>
              {presentation !== "minimal" && <span className="text-xs font-extrabold tracking-[0.15em] text-[var(--site-primary)]">{String(index + 1).padStart(2, "0")}</span>}
              <h3 className="mt-8 font-[var(--font-heading)] text-2xl font-extrabold tracking-tight text-[var(--site-heading)]">{item.title}</h3>
              <p className="mt-3 leading-7 text-[var(--site-muted)]">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
