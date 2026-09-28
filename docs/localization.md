# Localization platform

Localization is platform-owned. Client branches supply configuration, translated content, and optional source adapters; they do not fork routing, SEO, or CMS behavior.

## Site configuration

Existing installations need no migration. Records without `locale` use `site.defaultLocale`, and the default locale keeps its existing unprefixed URLs.

Languages are opt-in. A site with only its default locale has no editor translation selector or public language picker. Editors can add a language in Settings → Languages when needed; existing content stays in the default language. Removing a language is prevented while it has content.

```ts
site: {
  defaultLocale: "en",
  locales: [
    { code: "en", label: "English", hreflang: "en", pathPrefix: "en" },
    { code: "de", label: "Deutsch", hreflang: "de", pathPrefix: "de" },
    { code: "ar", label: "العربية", hreflang: "ar", pathPrefix: "ar", direction: "rtl" },
  ],
  localeRouting: {
    strategy: "prefix-except-default",
    categoryBasePath: "category",
  },
  localeMessages: {
    de: { home: "Startseite", menu: "Menü", page: "Seite" },
    ar: { home: "الرئيسية", menu: "القائمة", page: "صفحة" },
  },
}
```

Routing strategies:

- `prefix-except-default`: `/about/` and `/de/ueber-uns/`
- `prefix-all`: `/en/about/` and `/de/ueber-uns/`
- `explicit`: no automatic prefix; every imported record should supply `path`

`path` is an exact public-path override. It is useful when preserving imported URLs and is never prefixed a second time.

## Localized records

Pages, entries, collections, and categories accept the same metadata:

```ts
{
  locale: "de",
  translationGroupId: "about-company",
  path: "/de/ueber-uns/",
}
```

`translationGroupId` is stable across translations of the same record. It drives the CMS language selector, `hreflang`, Open Graph locale alternates, and sitemap alternates. It is not inferred from a title or slug because that can silently connect unrelated content.

The public language picker links to the published translation of the current item. If none exists, it links to that language's published homepage and labels the destination accordingly. Languages without a published destination are omitted. Draft translations are excluded from SEO alternates; a single available version does not emit multilingual `hreflang` links. For `explicit` routing, the published homepage record supplies its exact imported path.

Navigation menus and shared blocks also accept `locale` and `translationGroupId`. Public navigation, automatic page navigation, CMS page lists, editor previews, category descendants, collection entries, and related articles are filtered to the active locale.

## CMS workflow

When more than one locale is enabled, the editor top bar shows a language selector. Selecting an existing translation opens it. Selecting a missing locale creates a draft clone, assigns a shared translation group, clears the canonical and exact path, maps a translated parent/collection/category when one exists, and regenerates block IDs.

The new draft must still be translated and reviewed before publishing. Content status remains independent per locale.

## WordPress workflow

```bash
npm run wp:audit -- https://example.com
npm run wp:import:site -- https://example.com --locales en,de,fr --default-locale en
npm run wp:apply -- migration-data/example-com --profile src/installations/example/wordpressProfile.ts --draft-only
```

`wp:audit` detects standards-based locale hints and writes `localization.json`. The explicit `--locales` gate on the full import prevents a misleading or ignored WordPress `lang` query from duplicating a whole site automatically.

WordPress plugins expose translation relationships differently. The reusable normalized contract is `locale`, `path`, and `translationGroupId`; a plugin-specific adapter or reviewed client profile maps its source fields into that contract. MitaTravel, Pilot, Skoove, and future clients remain isolated because none of those mappings belong in the platform importer.

For WPML, export only the imported records' `element_type`, `element_id`, `trid`, and `language_code` from `icl_translations` as a JSON array. Supported types are `post_post`, `post_page`, `tax_category`, and `tax_post_tag`. Taxonomy rows must additionally include `term_id` joined from `term_taxonomy`, because WPML's `element_id` is a `term_taxonomy_id` while the REST import uses `term_id` ([WPML table reference](https://wpml.org/documentation/support/wpml-tables)). After reviewing the rows, apply the bundle with `--wpml-export /absolute/path/to/translations.json --draft-only`. The apply command rejects missing source IDs, mismatched languages, duplicate members, and conflicting existing groups before writing the draft. It reports how many records and groups matched.

The current Skoove REST snapshot does not expose WPML translation IDs. Its articles and taxonomies therefore remain ungrouped until a verified source export or reviewed mapping supplies those relationships. The importer must not infer them from similar titles or slugs.
