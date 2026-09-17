import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function ImageGalleryView({ content }: { content: any }) {
  const presentation = ["theme", "grid", "mosaic", "feature", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";
  const isArticle = content.variant === "article";

  return (
    <section className={cx(isArticle ? ui.sectionCompact : ui.section, "overflow-hidden")} data-presentation={presentation} data-variant={isArticle ? "article" : "section"}>
      <div className={ui.container}>
        {content.title && !isArticle && <h2 className={cx(ui.heading, "mb-10 max-w-3xl")}>{content.title}</h2>}
        <div className={cx("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", isArticle && "grid-cols-1 sm:grid-cols-1 lg:grid-cols-1")}>
          {(content.images ?? []).map((image: any, index: number) => (
            <figure key={index} className={cx("group relative m-0 min-w-0 overflow-hidden rounded-[var(--site-media-radius)]", presentation === "minimal" && "rounded-none", !isArticle && index === 0 && (presentation === "mosaic" || presentation === "feature") && "sm:col-span-2 sm:row-span-2")}>
              <img
                src={typeof image === "string" ? image : image.src}
                className={cx("aspect-4/3 h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]", isArticle && "aspect-auto")}
                alt={typeof image === "string" ? `Gallery image ${index + 1}` : image.alt || ""}
                loading="lazy"
                decoding="async"
              />
              {typeof image !== "string" && image.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-[color-mix(in_srgb,var(--site-inverse)_72%,transparent)] px-4 py-3 text-sm text-[var(--site-on-inverse)]">{image.caption}</figcaption>}
            </figure>
          ))}
        </div>
        {content.title && isArticle && !(content.images ?? []).some((image: any) => typeof image !== "string" && image.caption) && (
          <figcaption className="mt-3 text-center text-sm leading-6 text-[var(--site-muted)]">{content.title}</figcaption>
        )}
      </div>
    </section>
  );
}
