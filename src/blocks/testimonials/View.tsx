import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function TestimonialsView({ content }: { content: any }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const presentation = ["theme", "cards", "spotlight", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";

  return (
    <section className={ui.section} data-presentation={presentation}>
      <div className={ui.container}>
        <div className="max-w-3xl">
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          <h2 className={ui.heading}>{content.title}</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {items.map((item: any, index: number) => (
            <figure key={index} className={cx(ui.card, "m-0 flex min-h-64 flex-col justify-between p-7 sm:p-9", presentation === "spotlight" && index === 0 && "md:col-span-2", presentation === "minimal" && "min-h-0 rounded-none border-x-0 border-b-0 bg-transparent px-0 shadow-none")}>
              <blockquote className={cx("m-0 font-[var(--font-heading)] text-2xl font-bold leading-snug tracking-tight text-[var(--site-heading)]", presentation === "spotlight" && index === 0 && "sm:text-4xl")}>“{item.quote}”</blockquote>
              <figcaption className="mt-8 flex items-center gap-3">
                {item.image && <img className="h-11 w-11 rounded-full object-cover" src={item.image} alt="" loading="lazy" decoding="async" />}
                <div>
                  <strong className="block text-sm text-[var(--site-heading)]">{item.name}</strong>
                  {item.role && <span className="mt-0.5 block text-xs text-[var(--site-muted)]">{item.role}</span>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
