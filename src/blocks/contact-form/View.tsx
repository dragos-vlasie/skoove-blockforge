import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function ContactFormView({ content }: { content: any }) {
  const presentation = ["theme", "split", "centered", "compact"].includes(content.presentation)
    ? content.presentation
    : "theme";

  return (
    <section id="contact" className={cx(ui.section, presentation === "compact" && "py-[var(--site-section-space-compact)]")} data-presentation={presentation}>
      <div className={cx(ui.container, "grid items-start gap-10 lg:grid-cols-2 lg:gap-16", (presentation === "centered" || presentation === "compact") && "max-w-4xl lg:grid-cols-1")}>
        <div className={cx("max-w-2xl", presentation === "centered" && "mx-auto text-center")}>
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          <h2 className={cx(ui.heading, presentation === "centered" && "mx-auto")}>{content.title}</h2>
          {content.subtitle && <p className={cx(ui.copy, presentation === "centered" && "mx-auto")}>{content.subtitle}</p>}
          {content.email && <a className={cx(ui.buttonSecondary, "mt-7")} href={`mailto:${content.email}`}>{content.email}</a>}
        </div>
        <form className={cx(ui.card, "p-6 sm:p-8")} name="contact" method="post" data-netlify="true">
          <input type="hidden" name="form-name" value="contact" />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={ui.fieldLabel}>
              Name
              <input className={ui.field} name="name" type="text" />
            </label>
            <label className={ui.fieldLabel}>
              Email
              <input className={ui.field} name="email" type="email" />
            </label>
            <label className={cx(ui.fieldLabel, "sm:col-span-2")}>
              Message
              <textarea className={cx(ui.field, "min-h-36 resize-y")} name="message" />
            </label>
          </div>
          <button className={cx(ui.buttonPrimary, "mt-6")} type="submit">
            {content.buttonText || "Send message"}
          </button>
        </form>
      </div>
    </section>
  );
}
