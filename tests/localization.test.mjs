import assert from "node:assert/strict";
import test from "node:test";
import { getLanguageDestinations, getLocalizedHomeDestination, getTranslationAlternates } from "../src/localization/translations.ts";
import { applyWpmlTranslationExport } from "../src/importers/wordpress/wpml.ts";

const page = (id, locale, path, translationGroupId, status = "published", slug = "article") => ({
  id, kind: "page", locale, path, translationGroupId, status, slug,
});

const graph = {
  site: {
    siteUrl: "https://example.test/blog",
    defaultLocale: "en",
    locales: [
      { code: "en", label: "English", enabled: true },
      { code: "de", label: "Deutsch", enabled: true },
      { code: "fr", label: "Français", enabled: true },
    ],
    localeRouting: { strategy: "explicit" },
  },
  pages: [
    page("home-en", "en", "/blog/", "home", "published", "/"),
    page("home-de", "de", "/blog/de/", "home", "published", "/"),
    page("home-fr", "fr", "/blog/fr/", "home", "draft", "/"),
    page("article-en", "en", "/blog/lesson/", "lesson"),
    page("article-de", "de", "/blog/de/lektion/", "lesson", "draft"),
  ],
  entries: [], collectionDefinitions: [], categories: [],
};

test("language destinations use exact published translations and published home fallbacks", () => {
  assert.equal(getLocalizedHomeDestination(graph, "de"), "/blog/de/");
  assert.equal(getLocalizedHomeDestination(graph, "fr"), undefined);
  assert.deepEqual(getLanguageDestinations(graph, graph.pages[3]), [
    { locale: "en", label: "English", path: "/blog/lesson/", isTranslation: true },
    { locale: "de", label: "Deutsch", path: "/blog/de/", isTranslation: false },
  ]);
  assert.equal(getTranslationAlternates(graph, graph.pages[3]).length, 1);
});

test("published sibling becomes the language destination", () => {
  const published = { ...graph, pages: graph.pages.map((item) => item.id === "article-de" ? { ...item, status: "published" } : item) };
  assert.equal(getLanguageDestinations(published, published.pages[3])[1].path, "/blog/de/lektion/");
  assert.equal(getTranslationAlternates(published, published.pages[3]).length, 2);
});

test("a single-language site has no public language picker destinations beyond itself", () => {
  const single = { ...graph, site: { ...graph.site, locales: [{ code: "en", label: "English" }] } };
  assert.equal(getLanguageDestinations(single, single.pages[3]).length, 1);
});

test("WPML export links matching imported records and rejects mismatches atomically", () => {
  const imported = {
    ...graph,
    entries: [
      { id: "wp-post-10", locale: "en" },
      { id: "wp-post-11", locale: "de" },
    ],
  };
  const rows = [
    { element_type: "post_post", element_id: 10, trid: 8, language_code: "en" },
    { element_type: "post_post", element_id: 11, trid: 8, language_code: "de" },
  ];
  assert.throws(() => applyWpmlTranslationExport(imported, [rows[0], { ...rows[1], language_code: "fr" }]), /locale mismatch/);
  assert.equal(imported.entries[0].translationGroupId, undefined);
  assert.deepEqual(applyWpmlTranslationExport(imported, rows), { matched: 2, groups: 1 });
  assert.equal(imported.entries[0].translationGroupId, "wpml-post_post-8");
  assert.equal(imported.entries[1].translationGroupId, "wpml-post_post-8");
  assert.throws(() => applyWpmlTranslationExport(imported, [...rows, rows[0]]), /repeats/);
});

test("WPML taxonomy rows require a joined WordPress term ID", () => {
  const imported = { ...graph, categories: [{ id: "wp-category-42", locale: "en" }] };
  const row = { element_type: "tax_category", element_id: 900, trid: 70, language_code: "en" };
  assert.throws(() => applyWpmlTranslationExport(imported, [row]), /needs term_id/);
  assert.deepEqual(applyWpmlTranslationExport(imported, [{ ...row, term_id: 42 }]), { matched: 1, groups: 1 });
  assert.equal(imported.categories[0].translationGroupId, "wpml-tax_category-70");
});
