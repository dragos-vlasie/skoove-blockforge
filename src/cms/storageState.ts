import type { ContentGraph } from "../../types";
import { tabs } from "./constants";
import type { CmsTab, Selection } from "./types";

const selectedContentStorageKey = "blockforge-cms:selected-content";
const activeTabStorageKey = "blockforge-cms:active-tab";

export const readStoredSelection = (): Selection | null => {
  if (typeof localStorage === "undefined") return null;

  try {
    const parsed = JSON.parse(localStorage.getItem(selectedContentStorageKey) || "null");
    if (!parsed || !["page", "entry"].includes(parsed.kind) || typeof parsed.id !== "string") return null;
    return parsed as Selection;
  } catch {
    return null;
  }
};

export const writeStoredSelection = (selection: Selection) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(selectedContentStorageKey, JSON.stringify(selection));
};

export const hasSelection = (graph: ContentGraph, selection: Selection | null) => {
  if (!selection) return false;
  return selection.kind === "page"
    ? graph.pages.some((page) => page.id === selection.id)
    : graph.entries.some((entry) => entry.id === selection.id);
};

export const fallbackSelection = (graph: ContentGraph): Selection | null => {
  const page = graph.pages[0];
  if (page) return { kind: "page", id: page.id };

  const entry = graph.entries[0];
  if (entry) return { kind: "entry", id: entry.id };

  return null;
};

export const reconcileSelection = (graph: ContentGraph, selection: Selection | null) =>
  hasSelection(graph, selection) ? selection : fallbackSelection(graph);

const normalizeLegacyTab = (value: unknown) => {
  if (value === "collections" || value === "categories" || value === "structure") return "content";
  if (value === "overview" || value === "navigation") return "content";
  return value;
};

export const isCmsTab = (value: unknown): value is CmsTab =>
  typeof normalizeLegacyTab(value) === "string" && tabs.some((tab) => tab.id === normalizeLegacyTab(value));

export const readUrlTab = (): CmsTab | null => {
  if (typeof window === "undefined") return null;
  const tab = new URL(window.location.href).searchParams.get("tab");
  const normalizedTab = normalizeLegacyTab(tab);
  return isCmsTab(normalizedTab) ? normalizedTab : null;
};

export const readStoredTab = (): CmsTab | null => {
  if (typeof localStorage === "undefined") return null;
  const tab = localStorage.getItem(activeTabStorageKey);
  const normalizedTab = normalizeLegacyTab(tab);
  return isCmsTab(normalizedTab) ? normalizedTab : null;
};

export const readInitialTab = (): CmsTab => readUrlTab() ?? readStoredTab() ?? "editor";

export const writeStoredTab = (tab: CmsTab) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(activeTabStorageKey, tab);
};

export const writeUrlTab = (tab: CmsTab) => {
  if (typeof window === "undefined" || window.location.pathname !== "/cms") return;

  const url = new URL(window.location.href);
  if (tab === "editor") {
    url.searchParams.delete("tab");
  } else {
    url.searchParams.set("tab", tab);
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) window.history.replaceState(window.history.state, "", nextUrl);
};
