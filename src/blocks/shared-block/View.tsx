export function SharedBlockView({ content }: { content: any }) {
  return (
    <section className="w-full min-w-0 border-y border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Shared block reference</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{content.refId || "No shared block selected"}</p>
    </section>
  );
}
