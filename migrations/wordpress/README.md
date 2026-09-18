# Skoove WordPress migration

This directory owns the Skoove-specific part of the migration. The reusable WordPress importer, localization model, validation, and draft-only database writer live in BlockForge CMS.

## Source and target policy

- Source: the reviewed `cms.skoove/blog` WordPress export bundle.
- Locales: `en`, `de`, `es`, `fr`, `ja`, `ko`, `zh-Hans`, and `zh-Hant`.
- Media: keep reviewed WordPress media URLs linked; do not create duplicate CMS asset records.
- Hosted target: tenant `skoove`, site `main`.
- Write policy: draft only. Publishing is a separate CMS action after review.
- The generated migration bundle and source manifest may contain source data and remain untracked.

## Apply safely

Run the BlockForge importer from the BlockForge repository. First validate without writing:

```sh
npm run wp:apply -- /absolute/path/to/skoove-blog-full \
  --profile /absolute/path/to/skoove-blockforge/migrations/wordpress/profile.ts \
  --target database --tenant skoove --site main --draft-only --dry-run
```

After reviewing the output, remove `--dry-run` and add the exact target confirmation:

```sh
npm run wp:apply -- /absolute/path/to/skoove-blog-full \
  --profile /absolute/path/to/skoove-blockforge/migrations/wordpress/profile.ts \
  --target database --tenant skoove --site main --draft-only \
  --confirm skoove/main
```

Do not publish from the importer. Do not change `BLOG_HOST`, the `/blog` proxy, or `skoove-next` as part of this migration.
