import { useState, type ReactNode } from "react";

export function PropertySection({
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const heading = (
    <div className="min-w-0">
      <h3 className="text-[12px] font-semibold leading-5 text-slate-900">{title}</h3>
      {description && <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{description}</p>}
    </div>
  );

  if (collapsible) {
    return (
      <details
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2.5 marker:hidden">
          {heading}
          <span className="mt-0.5 text-xs text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
        </summary>
        <div className="border-t border-slate-100 px-3 py-3">{children}</div>
      </details>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      {heading}
      <div className="mt-3">{children}</div>
    </section>
  );
}
