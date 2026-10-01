import { useState } from "react";
import type { ContentGraph, LocaleConfig } from "../../../types";
import { canonicalLocaleCode, getConfiguredLocales, inferLocaleDirection } from "../../localization/registry";

export function LocalizationSettingsPanel({
  graph,
  onPatch,
}: {
  graph: ContentGraph;
  onPatch: (updater: (draft: ContentGraph) => void) => void;
}) {
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  const locales = graph.site.locales?.length ? graph.site.locales : getConfiguredLocales(graph.site);
  const enabledLocales = locales.filter((locale) => locale.enabled !== false);
  const defaultCode = canonicalLocaleCode(graph.site.defaultLocale);
  const content = [...graph.pages, ...graph.entries];
  const groupSizes = new Map<string, number>();
  for (const record of content) {
    if (!record.translationGroupId) continue;
    const key = `${record.kind}:${record.translationGroupId}`;
    groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
  }

  const updateLocale = (code: string, update: Partial<LocaleConfig>) => onPatch((draft) => {
    const existing = draft.site.locales?.length ? draft.site.locales : getConfiguredLocales(draft.site);
    draft.site.locales = existing.map((locale) => locale.code.toLowerCase() === code.toLowerCase()
      ? { ...locale, ...update }
      : locale);
  });

  const addLocale = () => {
    const code = canonicalLocaleCode(newCode);
    try {
      if (!code || Intl.getCanonicalLocales(code).length !== 1) throw new Error();
    } catch {
      setError("Enter a valid language code, such as de or fr-CA.");
      return;
    }
    if (locales.some((locale) => locale.code.toLowerCase() === code.toLowerCase())) {
      setError("This language is already configured.");
      return;
    }
    onPatch((draft) => {
      draft.site.locales = [
        ...(draft.site.locales?.length ? draft.site.locales : getConfiguredLocales(draft.site)),
        { code, label: code, hreflang: code, pathPrefix: code.toLowerCase(), direction: inferLocaleDirection(code), enabled: true },
      ];
    });
    setNewCode("");
    setError("");
  };

  const hasContent = (code: string) => [
    ...graph.pages, ...graph.entries, ...graph.collectionDefinitions, ...graph.categories,
    ...graph.navigation, ...graph.sharedBlocks,
  ].some((record) => (record.locale ?? defaultCode).toLowerCase() === code.toLowerCase());

  return <section className="rounded-xl border border-[#e4e7ec] bg-white">
    <div className="border-b border-[#e4e7ec] px-5 py-4 sm:px-6">
      <h2 className="text-lg font-semibold text-[#101828]">Languages</h2>
      <p className="mt-1 text-sm text-[#667085]">Add a language only when this site needs translated content. Each translation is edited and published separately.</p>
    </div>
    <div className="space-y-5 p-5 sm:p-6">
      <p className="text-sm text-[#344054]">{enabledLocales.length === 1 ? "This site uses one language. Translation controls are hidden." : `${enabledLocales.length} languages are configured.`}</p>
      <div className="grid gap-4">
        {locales.map((locale) => {
          const isDefault = locale.code.toLowerCase() === defaultCode.toLowerCase();
          const used = hasContent(locale.code);
          return <div key={locale.code} className="grid gap-3 rounded-lg border border-[#e4e7ec] p-4 sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-end">
            <div><span className="text-xs font-semibold text-[#667085]">Code</span><p className="mt-2 text-sm font-semibold text-[#101828]">{locale.code}{isDefault ? " · default" : ""}</p></div>
            <label className="grid gap-1 text-xs font-semibold text-[#667085]">Display name
              <input value={locale.label} onChange={(event) => updateLocale(locale.code, { label: event.target.value })} className="h-10 rounded-lg border border-[#d9dee7] px-3 text-sm font-normal text-[#101828]" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[#667085]">URL prefix
              <input value={locale.pathPrefix ?? ""} disabled={graph.site.localeRouting?.strategy === "explicit" || isDefault} onChange={(event) => updateLocale(locale.code, { pathPrefix: event.target.value.replace(/^\/+|\/+$/g, "") })} className="h-10 rounded-lg border border-[#d9dee7] px-3 text-sm font-normal text-[#101828] disabled:bg-[#f2f4f7]" />
            </label>
            {!isDefault && <button type="button" disabled={used} title={used ? "This language has content and cannot be removed." : undefined} onClick={() => onPatch((draft) => { draft.site.locales = draft.site.locales?.filter((item) => item.code.toLowerCase() !== locale.code.toLowerCase()); })} className="h-10 rounded-lg border border-[#d9dee7] px-3 text-sm text-[#344054] hover:bg-[#f2f4f7] disabled:cursor-not-allowed disabled:opacity-40">Remove</button>}
          </div>;
        })}
      </div>
      {enabledLocales.length > 1 && <div className="overflow-x-auto border-t border-[#e4e7ec] pt-5">
        <h3 className="mb-3 text-sm font-semibold text-[#101828]">Content by language</h3>
        <table className="w-full min-w-96 text-left text-sm text-[#344054]">
          <thead><tr className="border-b border-[#e4e7ec] text-xs text-[#667085]"><th className="py-2 pr-3">Language</th><th className="py-2 pr-3">Published</th><th className="py-2 pr-3">Draft</th><th className="py-2">Linked translations</th></tr></thead>
          <tbody>{enabledLocales.map((locale) => {
            const records = content.filter((record) => (record.locale ?? defaultCode).toLowerCase() === locale.code.toLowerCase());
            const linked = records.filter((record) => record.translationGroupId && (groupSizes.get(`${record.kind}:${record.translationGroupId}`) ?? 0) > 1).length;
            return <tr key={locale.code} className="border-b border-[#f2f4f7] last:border-0"><th scope="row" className="py-2 pr-3 font-medium">{locale.label}</th><td className="py-2 pr-3">{records.filter((record) => record.status === "published").length}</td><td className="py-2 pr-3">{records.filter((record) => record.status === "draft").length}</td><td className="py-2">{linked} / {records.length}</td></tr>;
          })}</tbody>
        </table>
        <p className="mt-2 text-xs text-[#667085]">Linked translations share a translation group with another language. Unlinked records need review before a page-level language switch can connect them.</p>
      </div>}
      <div className="flex flex-wrap items-end gap-3 border-t border-[#e4e7ec] pt-5">
        <label className="grid gap-1 text-xs font-semibold text-[#667085]">Add language code
          <input value={newCode} onChange={(event) => setNewCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addLocale(); }} placeholder="de or fr-CA" className="h-10 rounded-lg border border-[#d9dee7] px-3 text-sm font-normal text-[#101828]" />
        </label>
        <button type="button" onClick={addLocale} className="h-10 rounded-lg bg-[#6d5dfc] px-4 text-sm font-semibold text-white hover:bg-[#5947e8]">Add language</button>
        {error && <p role="alert" className="w-full text-sm text-rose-700">{error}</p>}
      </div>
      {graph.site.localeRouting?.strategy === "explicit" && <p className="text-sm text-[#667085]">This site preserves exact imported URLs, so URL prefixes are set on individual pages.</p>}
    </div>
  </section>;
}
