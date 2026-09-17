import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function FaqView({ content }: { content: any }) {
  const items = Array.isArray(content.items)
    ? content.items
    : Array.isArray(content.faq_list)
      ? content.faq_list
      : [];
  const tagLine = content.tagLine ?? content.tag_line;
  const presentation = ["theme", "split", "stacked", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";

  return (
    <section className={ui.section} data-presentation={presentation} id="faq">
      <div className={cx(ui.container, "grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16", (presentation === "stacked" || presentation === "minimal") && "lg:grid-cols-1")}>
        <div className="max-w-2xl">
          {tagLine && <p className={ui.eyebrow}>{tagLine}</p>}
          <h2 className={ui.heading}>{content.headline}</h2>
        </div>
        <div className="border-t border-[var(--site-border)]">
          {items.map((item: any, index: number) => (
            <details className="group border-b border-[var(--site-border)]" key={index} open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 font-[var(--font-heading)] text-lg font-extrabold text-[var(--site-heading)] marker:hidden sm:text-xl [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--site-border)] text-[var(--site-primary)] transition group-open:rotate-45", presentation === "minimal" && "border-0")} aria-hidden="true">+</span>
              </summary>
              <div className="max-w-3xl pb-6 leading-7 text-[var(--site-muted)]">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
