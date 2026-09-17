type SkooveLearningPathHeroContent = {
  eyebrow?: string;
  title?: string;
  description?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  trustLine?: string;
};

export default function SkooveLearningPathHero({
  content,
}: {
  content: SkooveLearningPathHeroContent;
}) {
  return (
    <section className="overflow-hidden bg-[#f7f5ff] px-6 py-16 text-[#171329] sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)] lg:items-center">
        <div>
          {content.eyebrow && (
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#6d43f5]">
              {content.eyebrow}
            </p>
          )}
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            {content.title}
          </h1>
          {content.description && (
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#5d5870] sm:text-xl">
              {content.description}
            </p>
          )}
          <div className="mt-9 flex flex-wrap gap-3">
            {content.primaryCtaLabel && (
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#6d43f5] px-7 py-3 text-sm font-extrabold text-white no-underline shadow-lg shadow-violet-300/40 transition hover:-translate-y-0.5 hover:bg-[#5730dc]"
                href={content.primaryCtaHref || "#"}
              >
                {content.primaryCtaLabel}
              </a>
            )}
            {content.secondaryCtaLabel && (
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d7cfef] bg-white px-7 py-3 text-sm font-extrabold text-[#33285c] no-underline transition hover:-translate-y-0.5 hover:border-[#a994eb]"
                href={content.secondaryCtaHref || "#"}
              >
                {content.secondaryCtaLabel}
              </a>
            )}
          </div>
          {content.trustLine && (
            <p className="mt-7 text-sm font-semibold text-[#746d88]">{content.trustLine}</p>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-10 rounded-full bg-violet-300/30 blur-3xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[#20183d] p-5 shadow-2xl shadow-violet-300/30 sm:p-7">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-200">Today&apos;s lesson</p>
                <p className="mt-2 text-2xl font-black">Play with confidence</p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#8af2c0] text-lg text-[#171329]">♪</span>
            </div>
            <div className="mt-8 rounded-2xl bg-white p-3 shadow-inner">
              <div className="grid h-48 grid-cols-8 gap-1 overflow-hidden rounded-xl bg-slate-100 p-2 sm:h-56">
                {Array.from({ length: 8 }, (_, index) => (
                  <div className="relative rounded-b-lg bg-white shadow-sm" key={index}>
                    {[1, 2, 4, 5, 6].includes(index) && (
                      <span className="absolute -right-[28%] top-0 z-10 h-[58%] w-[56%] rounded-b-md bg-[#171329]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full w-2/3 rounded-full bg-[#8af2c0]" />
              </span>
              <span className="text-xs font-bold text-white/70">12 min</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
