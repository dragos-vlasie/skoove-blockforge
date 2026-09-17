import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function ImageTextView({ content }: { content: any }) {
  const layout = ["theme", "image-left", "image-right", "image-top"].includes(content.layout)
    ? content.layout
    : "theme";

  return (
    <section className={ui.sectionSoft} data-layout={layout}>
      <div className={cx(ui.container, "grid items-center gap-10 lg:grid-cols-2 lg:gap-16", layout === "image-top" && "lg:grid-cols-1")}>
        <div className={cx(ui.media, "min-h-80", layout === "image-right" && "lg:order-2", layout === "image-top" && "lg:min-h-[30rem]")}>
          <img className="h-full min-h-80 w-full object-cover" src={content.image} alt={content.imageAlt || ""} loading="lazy" />
        </div>
        <div className={cx("max-w-2xl", layout === "image-right" && "lg:order-1")}>
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          <h2 className={ui.heading}>{content.title}</h2>
          <p className={ui.copy}>{content.body}</p>
          {content.buttonText && (
            <a href={content.href || "#content"} className={cx(ui.buttonPrimary, "mt-8")}>
              {content.buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
