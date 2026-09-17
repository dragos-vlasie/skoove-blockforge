# WordPress migration workflow

The WordPress importer is deliberately split into discovery, normalization, review, CMS application, and media transfer. It never modifies the source website.

## What is preserved

- public posts, pages, slugs, hierarchy, categories, tags, authors, and dates
- titles, excerpts, Yoast metadata, canonicals, Open Graph data, and source schema
- headings, paragraphs, bold, italic, underline, strike, inline code, subscript, superscript, links, lists, quotes, horizontal rules, and code blocks
- images, galleries, captions, alt text, tables, embeds, buttons, and common column layouts
- source classes, inline styles, alignment, source IDs, source URLs, and checksums for fidelity review

The first pass links images to WordPress. Downloading, optimizing, uploading, and URL replacement are intentionally a later media pass.

## Commands

Audit a website without converting documents:

```bash
npm run wp:audit -- https://example.com
```

The audit also writes `localization.json`. It discovers standard `hreflang` links and the HTML `lang` attribute, then probes WordPress REST counts for every candidate. Review that file before a multilingual import: a successful `?lang=` response does not by itself prove that a plugin applied the language filter.

Import reviewed locales explicitly:

```bash
npm run wp:import:site -- https://example.com --locales en,de,fr --default-locale en
```

Documents retain their source locale and exact source path. The generic importer does not guess translation relationships from matching slugs or titles. A client adapter or reviewed profile must supply a shared `translationGroupId` when the source plugin exposes that relationship.

Convert one public post or page:

```bash
npm run wp:import -- https://example.com/wp-json/wp/v2/posts/123
```

Trial a full-site import with five documents:

```bash
npm run wp:import:site -- https://example.com --limit 5
```

Normalize every public post and page:

```bash
npm run wp:import:site -- https://example.com
```

Use `--include post` or `--include page` to limit the content kind. Use `--output <directory>` to override the ignored `migration-data/<hostname>/` directory.

Apply an audited bundle to the local CMS draft and published stores:

```bash
npm run wp:apply -- migration-data/example-com
```

Use `--draft-only` when the migrated website still needs editorial review and must not appear in the published store yet.

Client-specific branding and composition must be supplied explicitly through an installation profile:

```bash
npm run wp:apply -- migration-data/example-com --profile src/installations/example/wordpressProfile.ts
```

Without `--profile`, the command produces a neutral Core-only website. The generic importer never selects client branding, curated source IDs, newsletter endpoints, navigation copy, an industry pack, or a theme on behalf of the caller.

Use `--content-root` to inspect generated content without replacing the active installation:

```bash
npm run wp:apply -- migration-data/example-com --content-root /tmp/example-wordpress-content
```

`wp:apply` builds the global website system as well as individual documents: site identity and theme, header and footer navigation, page routes, the article collection, nested category archives, and SEO metadata. Parent category archives include entries assigned to their descendant categories, matching WordPress taxonomy behavior. It preserves existing public article paths so the migration does not introduce unnecessary redirects.

## Mapping principle

The importer maps repeatable source structures to reusable CMS blocks. It does not create a component for every fragment of text.

- ordinary headings, paragraphs, lists, links, and inline formatting remain semantic rich text
- repeated newsletter forms become the Core Newsletter Signup block
- repeated post feeds and archives use the collection-aware Core Blog Grid block
- WordPress covers, tables, columns, galleries, and supported embeds map to existing reusable blocks
- publication identity and article composition come from the Editorial Publication pack
- isolated or ambiguous markup remains editable rich text and is recorded for review

This boundary keeps migrated content faithful without coupling the platform to one WordPress theme or one client.

## Generated bundle

```text
migration-data/<hostname>/
  inventory.json                 public API counts and taxonomy inventory
  localization.json              detected locales, REST evidence, and default locale
  routes.json                    discovered WordPress routes
  import-manifest.json           batch result and failure summary
  route-map.json                 source-to-target URL decisions
  source/                        immutable REST API snapshots
  documents/                     normalized editable documents
  reports/content-fidelity.json  per-document mapping and issue report
  reports/review-queue.json      documents requiring a human decision
  reports/repeated-fragments.json recurring HTML that should become one reusable mapping
  reports/pattern-candidates.json component/provider mappings ranked by frequency
  reports/<document>.json        single-document report
```

Generated migration data is ignored by Git. The importer code and pack definitions are versioned; client source snapshots are not.

## Fidelity gates

A document is not ready to apply to CMS content when it has a blocking issue. Warnings require human review. Informational issues document known limitations, such as the public API exposing rendered HTML rather than raw Gutenberg comments.

For the final migration, prefer either an authenticated REST request with `context=edit` or a WordPress WXR export. Both expose more source metadata than the public API. Public rendered HTML is still sufficient for the current semantic mapping proof.

The target theme is a separate concern from content parsing. The Editorial Publication pack composes Core blocks and uses the `journal-classic` theme by default. The generated site may customize that semantic theme with the source publication's brand colors, fonts, logo, and spacing. Arbitrary WordPress CSS is not copied into the CMS unchecked.

## Required cleanup before this importer is reusable

- Refactor the public templates to be Tailwind-first. `src/styles/public.css` has grown into a large global stylesheet with duplicated migration-era rules and cascade overrides. Move layout, spacing, responsive behavior, and component presentation into template and block classes; retain global CSS only for semantic theme tokens and behavior that cannot be expressed cleanly with utilities.
- Split CMS graph creation into a generic WordPress graph builder and an optional installation profile. The generic builder must not contain client names, source IDs, category labels, image URLs, newsletter endpoints, navigation copy, social profiles, curated post selections, or a forced theme.
- Move The Pilot Who Explores homepage composition, branding, category aliases, curated content IDs, newsletter configuration, and social metadata into a client-owned migration profile outside `src/importers/wordpress/`.
- Make pack and theme selection explicit importer inputs with neutral defaults rather than automatically selecting Editorial Publication and `field-journal`.
- Add a fixture from a second unrelated WordPress website and verify that importing it produces no Pilot-specific strings or URLs.
