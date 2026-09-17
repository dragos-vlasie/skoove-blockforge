export function PublicationHeroView({ content }: { content: any }) {
  const routes = Array.isArray(content.routes) ? content.routes : [];
  const isAbout = content.presentation === "about";
  const Heading = isAbout ? "h2" : "h1";
  const hasPortrait = typeof content.portraitImage === "string" && content.portraitImage.trim().length > 0;
  const hasJourney = typeof content.journeyImage === "string" && content.journeyImage.trim().length > 0;

  return (
    <section
      className="relative isolate overflow-hidden bg-[linear-gradient(135deg,color-mix(in_srgb,var(--site-primary)_10%,white),var(--site-background)_52%,color-mix(in_srgb,var(--site-accent)_12%,white))] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-text)]"
      data-presentation={isAbout ? "about" : "hero"}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-60 overflow-hidden opacity-45" aria-hidden="true">
        <svg className="h-full w-full fill-none stroke-[var(--site-primary)] stroke-2" viewBox="0 0 900 240" preserveAspectRatio="none">
          <path d="M-20 190 C160 45 310 220 480 92 C620 -14 760 46 930 8" />
          <circle className="fill-[var(--site-accent)] stroke-none" cx="481" cy="92" r="6" />
        </svg>
      </div>

      <div className="relative mx-auto grid w-full max-w-[var(--site-container-width)] items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(28rem,1.05fr)] lg:gap-14">
        <div className="relative z-10">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">{content.eyebrow}</p>
          <Heading className="m-0 mt-5 max-w-[15ch] text-balance font-[var(--font-heading)] text-[clamp(2.75rem,6vw,6.25rem)] font-[var(--site-heading-weight)] leading-[0.94] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">
            {content.title}
          </Heading>
          <p className="mt-7 max-w-[58ch] text-lg leading-8 text-[var(--site-muted)] sm:text-xl">{content.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--site-primary)] px-6 py-3 font-extrabold text-[var(--site-on-primary)] no-underline transition hover:-translate-y-0.5" href={content.primaryHref || "#explore"}>
              {content.primaryLabel}
            </a>
            <a className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[var(--site-primary)] px-6 py-3 font-extrabold text-[var(--site-primary)] no-underline transition hover:bg-[var(--site-primary)] hover:text-[var(--site-on-primary)]" href={content.secondaryHref || "#explore"}>
              {content.secondaryLabel}
            </a>
          </div>
        </div>

        <div className="relative min-h-[25rem] sm:min-h-[32rem] lg:min-h-[36rem]" aria-label={content.photoGroupLabel || "Publication introduction"}>
          <figure className="absolute inset-x-[8%] top-0 m-0 h-[88%] overflow-hidden rounded-[46%_46%_18%_18%/36%_36%_14%_14%] border-[0.45rem] border-white bg-[var(--site-surface)] shadow-[var(--site-media-shadow)]">
            {hasPortrait ? (
              <img className="h-full w-full object-cover" src={content.portraitImage} alt={content.portraitAlt || ""} loading={isAbout ? "lazy" : "eager"} decoding="async" />
            ) : (
              <span className="grid h-full place-items-center bg-[linear-gradient(145deg,var(--site-surface),color-mix(in_srgb,var(--site-primary)_18%,var(--site-background)))] px-8 text-center text-sm font-bold text-[var(--site-muted)]">Choose an author image</span>
            )}
            {content.portraitCaption && <figcaption className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[var(--site-heading)]">{content.portraitCaption}</figcaption>}
          </figure>
          <figure className="absolute bottom-0 left-0 m-0 h-[38%] w-[48%] -rotate-3 overflow-hidden rounded-[1.5rem] border-[0.4rem] border-white bg-[var(--site-surface)] shadow-[var(--site-card-shadow)]">
            {hasJourney ? (
              <img className="h-full w-full object-cover" src={content.journeyImage} alt={content.journeyAlt || ""} loading={isAbout ? "lazy" : "eager"} decoding="async" />
            ) : (
              <span className="grid h-full place-items-center bg-[linear-gradient(145deg,color-mix(in_srgb,var(--site-accent)_14%,var(--site-background)),var(--site-surface))] px-5 text-center text-xs font-bold text-[var(--site-muted)]">Choose a journey image</span>
            )}
            {content.journeyCaption && <figcaption className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--site-heading)]">{content.journeyCaption}</figcaption>}
          </figure>
          {content.stampText && <span className="absolute right-0 top-[8%] grid aspect-square w-28 rotate-6 place-items-center rounded-full border-2 border-dashed border-[var(--site-accent)] bg-[var(--site-background)] p-4 text-center text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--site-accent)]" aria-hidden="true">{content.stampText}</span>}
        </div>

        {routes.length > 0 && (
          <nav className="col-span-full mt-8 grid overflow-hidden rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-background)_88%,transparent)] sm:grid-cols-2 lg:grid-cols-[1.15fr_repeat(3,1fr)]" aria-label={content.routesAriaLabel || content.routesHeading || "Homepage navigation"}>
            <span className="flex min-h-28 items-center px-6 font-[var(--font-heading)] text-xl font-extrabold text-[var(--site-heading)]">{content.routesHeading}</span>
            {routes.map((route: any, index: number) => (
              <a className="relative flex min-h-28 flex-col justify-center border-t border-[var(--site-border)] px-6 text-[var(--site-heading)] no-underline transition hover:bg-[var(--site-surface)] sm:border-l sm:border-t-0" href={route.href || "#"} key={`${route.label}-${index}`}>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--site-accent)]">{route.code}</span>
                <strong className="mt-2">{route.label}</strong>
                <b className="absolute right-5 top-5" aria-hidden="true">↗</b>
              </a>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
