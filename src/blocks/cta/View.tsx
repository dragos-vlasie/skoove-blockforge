import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function CtaView({ content }: { content: any }) {
  const presentation = ["theme", "panel", "full-width", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";

  return (
    <section className={cx(presentation === "full-width" ? ui.sectionInverse : ui.section, presentation === "minimal" && "py-[var(--site-section-space-compact)]")} data-presentation={presentation}>
      <div className={cx(ui.container, presentation === "panel" || presentation === "theme" ? "rounded-[var(--site-card-radius)] bg-[var(--site-inverse)] px-7 py-10 text-[var(--site-on-inverse)] shadow-[var(--site-card-shadow)] sm:px-12 sm:py-14" : "")}>
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          <h2 className={cx("mt-3 font-[var(--font-heading)] text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl", presentation !== "minimal" && presentation !== "full-width" && "text-[var(--site-on-inverse)]")}>{content.title}</h2>
          {content.subtitle && <p className={cx("mt-4 max-w-2xl leading-7", presentation !== "minimal" ? "text-[color-mix(in_srgb,var(--site-on-inverse)_75%,transparent)]" : "text-[var(--site-muted)]")}>{content.subtitle}</p>}
          </div>
          {content.buttonText && (
            <a href={content.href || "#content"} className={cx(ui.buttonPrimary, "shrink-0")}>
              {content.buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
