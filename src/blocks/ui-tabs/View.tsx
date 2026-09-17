"use client";

import { Tabs } from "../../ui";

export function UiTabsView({ content }: { content: any }) {
  const tabs = Array.isArray(content.tabs) ? content.tabs : [];

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {content.eyebrow && (
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--site-primary,#6d5dfc)]">
            {content.eyebrow}
          </p>
        )}
        <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">{content.title}</h2>
        <Tabs
          className="mt-8"
          items={tabs.map((tab: any, index: number) => ({
            value: `tab-${index}`,
            label: tab.label,
            content: (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-extrabold text-slate-950">{tab.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{tab.body}</p>
              </div>
            ),
          }))}
        />
      </div>
    </section>
  );
}
