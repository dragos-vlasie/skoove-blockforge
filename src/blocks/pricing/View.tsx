import { cx, publicStyles as ui } from "../../styles/publicStyles";

export function PricingView({ content }: { content: any }) {
  const plans = Array.isArray(content.plans) ? content.plans : [];
  const presentation = ["theme", "cards", "featured", "compact"].includes(content.presentation)
    ? content.presentation
    : "theme";
  const isFeatured = (plan: any) => plan.featured && (presentation === "theme" || presentation === "featured");

  return (
    <section className={ui.sectionSoft} data-presentation={presentation}>
      <div className={ui.container}>
        <div className="mx-auto max-w-3xl text-center">
          {content.eyebrow && <p className={ui.eyebrow}>{content.eyebrow}</p>}
          <h2 className={cx(ui.heading, "mx-auto")}>{content.title}</h2>
          {content.subtitle && <p className={cx(ui.copy, "mx-auto")}>{content.subtitle}</p>}
        </div>
        <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-3">
          {plans.map((plan: any, index: number) => (
            <article
              key={index}
              className={cx(ui.card, "flex min-h-[28rem] flex-col p-7 sm:p-8", presentation === "compact" && "min-h-0 p-5")}
              data-featured={plan.featured ? "true" : "false"}
              style={isFeatured(plan) ? {
                backgroundColor: "var(--site-heading)",
                borderColor: "var(--site-heading)",
                color: "var(--site-background)",
              } : undefined}
            >
              <h3 className="m-0 text-base font-bold" style={{ color: isFeatured(plan) ? "var(--site-background)" : "var(--site-heading)" }}>{plan.name}</h3>
              <div className={cx("mt-6 font-[var(--font-heading)] text-4xl font-extrabold leading-none tracking-tight sm:text-5xl", presentation === "compact" && "mt-3 text-3xl")} style={{ color: isFeatured(plan) ? "var(--site-background)" : "var(--site-heading)" }}>{plan.price}</div>
              {plan.description && <p className={cx("mt-4 min-h-12 leading-7", presentation === "compact" && "min-h-0", isFeatured(plan) && "opacity-80")} style={{ color: isFeatured(plan) ? "var(--site-background)" : "var(--site-muted)" }}>{plan.description}</p>}
              {plan.features && (
                <ul className="mt-6 grid list-none gap-3 p-0 text-sm">
                  {String(plan.features)
                    .split(",")
                    .map((feature) => feature.trim())
                    .filter(Boolean)
                    .map((feature, featureIndex) => (
                      <li className="flex gap-3" key={featureIndex}>
                        <span className="font-black" style={{ color: isFeatured(plan) ? "var(--site-background)" : "var(--site-accent)" }} aria-hidden="true">+</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                </ul>
              )}
              {plan.buttonText && (
                <a href={plan.href || "#contact"} className={cx(ui.buttonPrimary, "mt-auto w-full translate-y-3 justify-center", isFeatured(plan) && "hover:opacity-90")} style={isFeatured(plan) ? { backgroundColor: "var(--site-background)", color: "var(--site-heading)" } : undefined}>
                  {plan.buttonText}
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
