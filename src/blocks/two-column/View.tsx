export function TwoColumnView({ content }: { content: any }) {
  const columns = Array.isArray(content.columns) ? content.columns : [];

  return (
    <section className="w-full min-w-0 bg-white px-6 py-14">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        {columns.slice(0, 2).map((column: any, index: number) => (
          <div key={column.id ?? index} className="min-w-0 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {column.label ?? `Column ${index + 1}`}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {(Array.isArray(column.blocks) ? column.blocks.length : 0)} nested block(s)
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
