"use client";

import { Accordion } from "../../ui";

export function UiAccordionView({ content }: { content: any }) {
  const items = Array.isArray(content.items) ? content.items : [];

  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.85fr_1.15fr]">
        <div>
          {content.eyebrow && (
            <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--site-primary,#6d5dfc)]">
              {content.eyebrow}
            </p>
          )}
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">{content.title}</h2>
        </div>
        <Accordion
          items={items.map((item: any, index: number) => ({
            id: `accordion-${index}`,
            title: item.title,
            content: item.body,
          }))}
        />
      </div>
    </section>
  );
}
