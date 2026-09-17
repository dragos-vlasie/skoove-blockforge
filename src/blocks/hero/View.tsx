import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function HeroView({ content }: { content: any }) {
  const layout = ["theme", "media-left", "media-right", "centered", "background"].includes(content.layout)
    ? content.layout
    : "theme";

  const isCentered = layout === "centered";
  const isBackground = layout === "background";
  const mediaFirst = layout === "media-left";

  return (
    <section className={cx(ui.section, "relative isolate min-h-[38rem] content-center", isBackground && "bg-[var(--site-inverse)] text-[var(--site-on-inverse)]")} data-layout={layout}>
      <div className={cx(ui.container, "relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16", isCentered && "grid-cols-1 text-center lg:grid-cols-1", isBackground && "min-h-[32rem] grid-cols-1 lg:grid-cols-1")}>
        <div className={cx("relative z-10 max-w-3xl", mediaFirst && "lg:order-2", isCentered && "mx-auto flex flex-col items-center", isBackground && "rounded-[var(--site-card-radius)] bg-[color-mix(in_srgb,var(--site-inverse)_76%,transparent)] p-7 backdrop-blur-sm sm:p-10")}>
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          <h1 className={cx(ui.display, isCentered && "max-w-[18ch]", isBackground && "text-[var(--site-on-inverse)]")}>{content.title}</h1>
          {content.subtitle && <p className={cx(ui.copy, isCentered && "mx-auto", isBackground && "text-[color-mix(in_srgb,var(--site-on-inverse)_78%,transparent)]")}>{content.subtitle}</p>}
          {(content.buttonText || content.secondaryButtonText) && (
            <div className={cx("mt-8 flex flex-wrap gap-3", isCentered && "justify-center")}>
              {content.buttonText && (
                <a href={content.href || "#content"} className={ui.buttonPrimary}>
                  {content.buttonText}
                </a>
              )}
              {content.secondaryButtonText && (
                <a href={content.secondaryHref || "#content"} className={cx(ui.buttonSecondary, isBackground && "border-[color-mix(in_srgb,var(--site-on-inverse)_45%,transparent)] text-[var(--site-on-inverse)] hover:bg-[color-mix(in_srgb,var(--site-on-inverse)_12%,transparent)]")}>
                  {content.secondaryButtonText}
                </a>
              )}
            </div>
          )}
        </div>

        <figure className={cx(ui.media, "relative m-0 min-h-80 lg:min-h-[34rem]", mediaFirst && "lg:order-1", isCentered && "mx-auto w-full max-w-5xl", isBackground && "absolute inset-0 -z-10 h-full min-h-0 max-w-none rounded-none shadow-none")}>
          <img
            src={content.bgImage || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80"}
            alt={content.imageAlt || ""}
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {isBackground && <span className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--site-inverse)_72%,transparent),color-mix(in_srgb,var(--site-inverse)_12%,transparent))]" aria-hidden="true" />}
          {content.imageCaption && <figcaption className="absolute inset-x-0 bottom-0 bg-[color-mix(in_srgb,var(--site-inverse)_72%,transparent)] px-4 py-3 text-sm text-[var(--site-on-inverse)] backdrop-blur-sm">{content.imageCaption}</figcaption>}
        </figure>
      </div>
    </section>
  );
}
