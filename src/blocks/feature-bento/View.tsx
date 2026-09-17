export function FeatureBentoView({ content }: { content: any }) {
  const items = Array.isArray(content.items) ? content.items : [];

  return (
    <section className="w-full bg-white px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          {content.eyebrow && (
            <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-blue-600">
              {content.eyebrow}
            </p>
          )}
          <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
            {content.title}
          </h2>
          {content.subtitle && <p className="mt-4 text-lg leading-8 text-slate-600">{content.subtitle}</p>}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item: any, index: number) => (
            <article
              key={index}
              className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${
                index === 0 ? "md:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <div className="mb-8 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent,#6d5dfc)] text-sm font-black text-white">
                {index + 1}
              </div>
              <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
