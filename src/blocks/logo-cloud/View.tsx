import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function LogoCloudView({ content }: { content: any }) {
  const logos = Array.isArray(content.logos) ? content.logos : [];
  const presentation = ["theme", "strip", "grid", "monochrome"].includes(content.presentation)
    ? content.presentation
    : "theme";

  return (
    <section className={cx(ui.sectionCompact, "border-y border-[var(--site-border)]")} data-presentation={presentation}>
      <div className={ui.container}>
        {content.eyebrow && <p className={cx(ui.eyebrow, "text-center")}>{content.eyebrow}</p>}
        <div className="mt-8 grid grid-cols-2 items-center gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {logos.map((logo: any, index: number) => {
            const mark = logo.src
              ? <img className={cx("h-9 max-w-full object-contain", presentation === "monochrome" && "grayscale opacity-70")} src={logo.src} alt={logo.name || ""} loading="lazy" decoding="async" />
              : <span>{logo.name}</span>;

            return logo.href ? (
              <a key={index} className={cx("flex min-h-20 items-center justify-center rounded-[var(--site-radius-sm)] border border-[var(--site-border)] bg-[var(--site-surface)] p-4 text-center font-bold text-[var(--site-muted)] no-underline", (presentation === "strip" || presentation === "monochrome") && "border-0 bg-transparent")} href={logo.href} aria-label={logo.name}>
                {mark}
              </a>
            ) : (
              <div key={index} className={cx("flex min-h-20 items-center justify-center rounded-[var(--site-radius-sm)] border border-[var(--site-border)] bg-[var(--site-surface)] p-4 text-center font-bold text-[var(--site-muted)]", (presentation === "strip" || presentation === "monochrome") && "border-0 bg-transparent")}>{mark}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
