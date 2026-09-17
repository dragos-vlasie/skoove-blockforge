import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function MediaView({ content }: { content: any }) {
  const aspectRatio = ["landscape", "portrait", "square", "natural"].includes(content.aspectRatio)
    ? content.aspectRatio
    : "landscape";
  const treatment = ["theme", "plain", "framed", "full-bleed"].includes(content.treatment)
    ? content.treatment
    : "theme";

  return (
    <section className={cx(ui.section, treatment === "full-bleed" && "px-0")} data-aspect={aspectRatio} data-treatment={treatment}>
      <figure className={cx("m-0", treatment !== "full-bleed" && ui.container, treatment === "framed" && "rounded-[var(--site-media-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-3 shadow-[var(--site-media-shadow)]")}>
        <img className={cx("w-full object-cover", aspectRatio === "landscape" && "aspect-video", aspectRatio === "portrait" && "aspect-3/4", aspectRatio === "square" && "aspect-square", aspectRatio === "natural" && "h-auto", treatment !== "plain" && treatment !== "full-bleed" && "rounded-[var(--site-media-radius)]")} src={content.image} alt={content.imageAlt || ""} loading="lazy" />
        {content.caption && <figcaption className="mt-3 text-center text-sm leading-6 text-[var(--site-muted)]">{content.caption}</figcaption>}
      </figure>
    </section>
  );
}
