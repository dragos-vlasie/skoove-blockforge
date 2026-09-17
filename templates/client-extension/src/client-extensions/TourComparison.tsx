type TourComparisonContent = {
  eyebrow?: string;
  title?: string;
  leftTour?: string;
  rightTour?: string;
  buttonLabel?: string;
};

export default function TourComparison({ content }: { content: TourComparisonContent }) {
  return (
    <section className="bg-slate-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">{content.eyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{content.title}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[content.leftTour, content.rightTour].map((tour) => (
            <article className="rounded-3xl border border-white/15 bg-white/10 p-7" key={tour}>
              <h3 className="text-2xl font-semibold">{tour}</h3>
              <button className="mt-8 rounded-full bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950" type="button">
                {content.buttonLabel}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
