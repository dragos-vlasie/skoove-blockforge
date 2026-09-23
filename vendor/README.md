# Shared preview package

`blockforge-preview-0.1.0.tgz` is the unmodified npm package built from
`dragos-vlasie/blockforge-cms` commit `772ae27` (merged in PR #20 at
`79f40f71236c00aca1b6dd98d0956efcced4cfaa`).

- Package: `@blockforge/preview@0.1.0`
- Protocol: v4 (`subject-updates`, `section-insertion`, `section-actions`)
- SHA-1: `e319ca3ff65dcbf6fb0fbea283cc4380d6e64202`
- npm integrity: `sha512-I3zMFNKimeu3brl98NTrMyN8RjiysIvOPsY04BmzAjViimMaCIZM0lhtck9ehcTyrtptVIZP60izfRwou8y0xQ==`

This committed artifact makes clean/Vercel installs reproducible without npm
registry credentials. The package-lock records its integrity. Do not edit the
artifact or fork its controls in this repository.

For future upgrades, release a new version in BlockForge, run `npm pack` there,
add the new artifact here, update the root/site dependency paths and lockfile,
then verify and deploy a reviewed Skoove PR. Adapter code changes are needed only
when the package integration contract changes.

## Integration

- `src/preview/protocol.ts` re-exports the installed protocol.
- `src/next/LivePreviewClient.tsx` connects Skoove's existing public renderer to
  the shared overlay. It validates host origin/source and advertises v4.
- The CMS authorizes actions in its render handshake and owns all mutations and
  Undo. This package does not save, publish, change shared sources or access data.
- The root and site Next configurations transpile the package. Public Tailwind
  CSS scans the installed package explicitly.

Merge/deploy the central CMS v4 host before this client. After this PR's Vercel
preview succeeds, merge to `main`, verify the production deployment and reload
the Skoove editor. Check both insertion and section-action capabilities, hover,
keyboard/touch selection, move/duplicate/remove with Undo and Browse mode.

Verification commands (no database/content writes):

```
npm run typecheck -- --incremental false
npm run build:site
node --test tests/preview-package.browser.test.mjs
node --test tests/preview-adapter.browser.test.mjs
```
