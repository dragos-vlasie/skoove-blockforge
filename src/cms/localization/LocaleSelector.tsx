import type { CollectionEntry, ContentGraph, PageContent } from "../../../types";
import { getConfiguredLocales, getContentLocale } from "../../localization/registry";
import { getTranslationSiblings } from "../../localization/translations";
import type { Selection } from "../types";

export function LocaleSelector({
  graph,
  item,
  onSelectContent,
  onCreateTranslation,
}: {
  graph: ContentGraph;
  item: PageContent | CollectionEntry | null;
  onSelectContent: (selection: Selection) => void;
  onCreateTranslation: (locale: string) => void;
}) {
  const locales = getConfiguredLocales(graph.site);
  if (!item || locales.length < 2) return null;

  const currentLocale = getContentLocale(item, graph.site);
  const translations = getTranslationSiblings(graph, item, { publicOnly: false });

  const changeLocale = (locale: string) => {
    const existing = translations.find(
      (candidate) => getContentLocale(candidate, graph.site).toLowerCase() === locale.toLowerCase(),
    );
    if (existing && "kind" in existing) {
      onSelectContent({
        kind: existing.kind === "page" ? "page" : "entry",
        id: existing.id,
      });
      return;
    }
    onCreateTranslation(locale);
  };

  return (
    <label className="hidden items-center gap-2 sm:flex">
      <span className="sr-only">Content language</span>
      <select
        value={currentLocale}
        onChange={(event) => changeLocale(event.target.value)}
        title="Switch language; choosing a missing language creates a draft translation"
        className="h-10 max-w-40 rounded-lg border border-[#d9dee7] bg-white px-2.5 text-xs font-bold text-[#344054] outline-none transition hover:border-[#b9adff] focus:border-[#6d5dfc]"
      >
        {locales.map((locale) => {
          const translation = translations.find(
            (candidate) => getContentLocale(candidate, graph.site).toLowerCase() === locale.code.toLowerCase(),
          );
          return (
            <option key={locale.code} value={locale.code}>
              {locale.label}{translation ? ` · ${"status" in translation ? translation.status : "available"}` : " · create draft"}
            </option>
          );
        })}
      </select>
    </label>
  );
}
