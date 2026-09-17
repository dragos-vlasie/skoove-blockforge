import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function UiCardGridView({ content }: { content: any }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const presentation = ["theme", "elevated", "bordered", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";
  const columns = ["2", "3", "4"].includes(String(content.columns)) ? String(content.columns) : "3";

  return (
    <section className={ui.section} data-presentation={presentation} data-columns={columns}>
      <div className={ui.container}>
        <div className="max-w-3xl">
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          <h2 className={ui.heading}>{content.title}</h2>
        </div>
        <div className={cx("mt-12 grid gap-4", columns === "2" && "md:grid-cols-2", columns === "3" && "md:grid-cols-2 lg:grid-cols-3", columns === "4" && "md:grid-cols-2 lg:grid-cols-4")}>
          {items.map((item: any, index: number) => (
            <article key={index} className={cx(ui.card, "group min-w-0 overflow-hidden", presentation === "elevated" && "transition duration-200 hover:-translate-y-1 hover:shadow-xl", presentation === "minimal" && "rounded-none border-x-0 border-b-0 bg-transparent shadow-none")}>
              {item.image && <img className="aspect-4/3 w-full object-cover transition duration-300 group-hover:scale-[1.025]" src={item.image} alt="" loading="lazy" decoding="async" />}
              <div className={cx("p-6 sm:p-7", presentation === "minimal" && "px-0")}>
              <h3 className="m-0 font-[var(--font-heading)] text-xl font-extrabold tracking-tight text-[var(--site-heading)]">{item.title}</h3>
              <p className="mt-3 leading-7 text-[var(--site-muted)]">{item.body}</p>
              {item.buttonText && (
                <a href={item.href || "#"} className="mt-5 inline-flex font-extrabold text-[var(--site-primary)] underline decoration-[color-mix(in_srgb,var(--site-primary)_35%,transparent)] underline-offset-4 hover:decoration-current">
                  {item.buttonText}
                </a>
              )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
