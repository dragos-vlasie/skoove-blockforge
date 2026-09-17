import type {
  Category,
  CollectionDefinition,
  CollectionEntry,
  ContentGraph,
  LocalizedRecord,
  PageContent,
} from "../../types";
import { getCategoryPath, getCollectionPath, getEntryPath, getPagePath } from "../lib/cms/routing";
import { absoluteUrl } from "../lib/cms/seo";
import { getConfiguredLocales, getContentLocale, getLocaleConfig } from "./registry";

export type LocalizedSubject = PageContent | CollectionEntry | CollectionDefinition | Category;

export type TranslationAlternate = {
  locale: string;
  hreflang: string;
  path: string;
  url: string;
};

const recordKind = (subject: LocalizedSubject) => {
  if ("kind" in subject) return subject.kind;
  if ("preset" in subject) return "collection";
  return "category";
};

const recordsFor = (graph: ContentGraph, subject: LocalizedSubject): LocalizedSubject[] => {
  const kind = recordKind(subject);
  if (kind === "page") return graph.pages;
  if (kind === "collectionEntry") return graph.entries;
  if (kind === "collection") return graph.collectionDefinitions;
  return graph.categories;
};

export const getLocalizedSubjectPath = (graph: ContentGraph, subject: LocalizedSubject) => {
  const kind = recordKind(subject);
  if (kind === "page") return getPagePath(subject as PageContent, graph);
  if (kind === "collectionEntry") {
    const entry = subject as CollectionEntry;
    const definition = graph.collectionDefinitions.find((candidate) => candidate.id === entry.collectionId);
    return getEntryPath(entry, definition, graph);
  }
  if (kind === "collection") return getCollectionPath(subject as CollectionDefinition, graph);
  return getCategoryPath(subject as Category, graph);
};

const isPublicSubject = (subject: LocalizedSubject) => {
  if ("status" in subject) return subject.status === "published";
  return subject.publicIndex;
};

export const getTranslationSiblings = (
  graph: ContentGraph,
  subject: LocalizedSubject,
  options: { publicOnly?: boolean } = {},
) => {
  const groupId = subject.translationGroupId;
  const candidates = groupId
    ? recordsFor(graph, subject).filter((candidate) => candidate.translationGroupId === groupId)
    : [subject];
  const visible = options.publicOnly === false ? candidates : candidates.filter(isPublicSubject);
  const byLocale = new Map<string, LocalizedSubject>();

  visible.forEach((candidate) => {
    const locale = getContentLocale(candidate as LocalizedRecord, graph.site);
    if (!byLocale.has(locale.toLowerCase())) byLocale.set(locale.toLowerCase(), candidate);
  });

  return [...byLocale.values()];
};

export const getTranslationAlternates = (
  graph: ContentGraph,
  subject: LocalizedSubject,
  options: { publicOnly?: boolean } = {},
): TranslationAlternate[] => {
  const enabled = new Set(getConfiguredLocales(graph.site).map((locale) => locale.code.toLowerCase()));

  return getTranslationSiblings(graph, subject, options)
    .map((candidate) => {
      const locale = getContentLocale(candidate, graph.site);
      const config = getLocaleConfig(graph.site, locale);
      const path = getLocalizedSubjectPath(graph, candidate);
      return {
        locale,
        hreflang: config.hreflang || config.code,
        path,
        url: absoluteUrl(graph.site, path),
      };
    })
    .filter((alternate) => enabled.has(alternate.locale.toLowerCase()))
    .sort((left, right) => left.locale.localeCompare(right.locale));
};

export const getDefaultTranslationAlternate = (
  graph: ContentGraph,
  alternates: TranslationAlternate[],
) =>
  alternates.find(
    (alternate) => alternate.locale.toLowerCase() === graph.site.defaultLocale.toLowerCase(),
  ) ?? alternates[0];
