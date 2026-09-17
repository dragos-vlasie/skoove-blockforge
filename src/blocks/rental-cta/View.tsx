const normalizePublicImagePath = (src = "") =>
  src.startsWith("public/") ? src.replace(/^public/, "") : src;

export function RentalCtaView({ content }: { content: any }) {
  const legacyImage = content.image && typeof content.image === "object" ? content.image : {};
  const legacyButton = content.button && typeof content.button === "object" ? content.button : {};
  const imageUrl = normalizePublicImagePath(content.imageUrl || legacyImage.image || "/city-rent/mainback.jpeg");
  const imageAlt = content.imageAlt || legacyImage.alt || "";
  const buttonText = content.buttonText || legacyButton.button_text;
  const buttonUrl = content.buttonUrl || legacyButton.button_url || "#";

  return (
    <section id="cta" className="hero relative min-h-screen overflow-hidden">
      <img src={imageUrl} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      <div className="hero-overlay absolute inset-0 bg-[var(--site-inverse)] opacity-75" />
      <div className="hero-content relative flex min-h-screen items-center justify-center p-8 text-center text-[var(--site-on-inverse)]">
        <div className="flex max-w-xl flex-col items-center p-8 md:p-0">
          <h2 className="mb-8 text-3xl font-bold tracking-tight md:mb-12 md:text-5xl">{content.headline}</h2>
          <p className="mb-12 text-lg opacity-80 md:mb-16">{content.description}</p>
          {buttonText && (
            <a
              href={buttonUrl}
              className="btn btn-primary btn-wide inline-flex min-w-64 items-center justify-center rounded-[var(--site-radius-sm)] bg-[var(--site-primary)] px-8 py-4 font-bold uppercase tracking-[0.08em] text-[var(--site-on-primary)] no-underline transition hover:bg-[var(--site-primary-strong)]"
            >
              {buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
