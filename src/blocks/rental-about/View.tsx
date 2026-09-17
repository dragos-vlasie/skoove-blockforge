const normalizePublicImagePath = (src = "") =>
  src.startsWith("public/") ? src.replace(/^public/, "") : src;

const FeaturedCarCard = ({ content }: { content: any }) => {
  const name = content.carName || "OPEL CORSA 1.2T";
  const image = normalizePublicImagePath(content.carImage || "/city-rent/opel-corsa.png");
  const price = content.carPrice || "45";
  const link = content.carLink || "/booking/options-selection";

  return (
    <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-[var(--site-radius)] border border-[color:var(--site-border)] bg-[var(--site-surface)] text-[var(--site-text)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-32 w-full overflow-hidden bg-[var(--site-surface-soft)] sm:h-36">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--site-inverse)]/15 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col items-center px-5 pb-5 pt-4 text-center">
        <h2 className="mb-2 line-clamp-2 min-h-[2.25rem] text-sm font-extrabold uppercase leading-tight tracking-tight text-[var(--site-heading)] sm:text-base">
          {name}
        </h2>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--site-muted)]">{content.carGroup || "Group B"}</p>
        <p className="mb-4 text-lg font-extrabold text-[var(--site-primary)]">From: EUR {price}</p>
        <div className="mt-auto w-full">
          <a
            href={link}
            className="block w-full rounded-[var(--site-radius-sm)] bg-[var(--site-primary)] px-5 py-3.5 text-sm font-bold text-[var(--site-on-primary)] no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--site-primary-strong)] hover:shadow-lg"
          >
            Book Now
          </a>
        </div>
      </div>
    </div>
  );
};

export function RentalAboutView({ content }: { content: any }) {
  const features = Array.isArray(content.features) ? content.features : [];

  return (
    <section className="bg-[var(--site-surface-soft)] text-[var(--site-text)]" id="aboutUs">
      <div className="mx-auto max-w-7xl space-y-24 py-24 md:space-y-32 md:py-32" id="aboutUs">
        <div className="mx-auto">
          <div className="flex flex-col px-8 md:flex-row md:space-x-10">
            <div className="w-full max-w-96 flex-shrink-0 self-center">
              <FeaturedCarCard content={content} />
            </div>
            <div className="mt-12 flex flex-col justify-center gap-8 md:mt-0">
              <span className="mx-12">
                <h4 className="mb-2 text-xl font-bold">{content.heading}</h4>
                <p className="mb-12 text-xl">{content.description}</p>
              </span>
              <ul className="flex flex-row flex-wrap space-y-8 lg:flex-nowrap lg:space-x-8 lg:space-y-0">
                {features.map((feature: any) => (
                  <li className="mx-auto min-w-40 max-w-72 text-center text-base" key={feature.title}>
                    <div className="mb-4 flex flex-col items-center justify-center">
                      {feature.path && (
                        <img
                          className="mb-2 h-8 w-8"
                          src={normalizePublicImagePath(feature.path)}
                          alt={feature.title}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <span className="text-xl font-bold">{feature.title}</span>
                    </div>
                    {feature.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
