import { cx, publicStyles as ui } from "../../styles/publicStyles";

const safeAction = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "#";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

export function NewsletterSignupView({ content }: { content: any }) {
  const presentation = ["theme", "inline", "panel", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";
  const action = safeAction(content.action);
  const emailFieldName = content.emailFieldName || "EMAIL";
  const emailLabel = content.emailLabel || "Email address";

  return (
    <section className={ui.sectionSoft} data-presentation={presentation}>
      <div className={cx(ui.container, "grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:gap-16", (presentation === "inline" || presentation === "minimal") && "items-center lg:grid-cols-2", presentation === "panel" && "rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-7 shadow-[var(--site-card-shadow)] sm:p-10")}>
        <div className="max-w-3xl">
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          <h2 className={ui.heading}>{content.title}</h2>
          {content.subtitle && <p className={ui.copy}>{content.subtitle}</p>}
        </div>
        <form className="min-w-0" action={action} method="post">
          <label className={ui.fieldLabel} htmlFor={`newsletter-${emailFieldName}`}>
            {emailLabel}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id={`newsletter-${emailFieldName}`}
              className={cx(ui.field, "min-w-0 flex-1")}
              name={emailFieldName}
              type="email"
              autoComplete="email"
              placeholder={content.emailPlaceholder || "you@example.com"}
              required
            />
            <button className={cx(ui.buttonPrimary, "shrink-0")} type="submit">
              {content.buttonText || "Subscribe"}
            </button>
          </div>
          {content.privacyText && <p className="mt-3 text-sm leading-6 text-[var(--site-muted)]">{content.privacyText}</p>}
        </form>
      </div>
    </section>
  );
}
