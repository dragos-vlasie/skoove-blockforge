# Client extensions

Client extensions are customer-specific React components deployed from a dedicated GitHub repository while their editable content remains managed by the central BlockForge CMS.

## Boundary

- BlockForge stores tenants, memberships, content, media metadata and the extension manifest.
- The client repository stores custom React/Tailwind components and integrations.
- The public Vercel project receives only the content API URL and its tenant/site identifiers.
- Client repositories never receive the database URL, Supabase secret or Vercel provisioning token.

## Manifest contract

The repository root may contain `blockforge.extension.json`. `schemaVersion` is currently `1`. Block types use the `CUSTOM:` namespace so they cannot collide with BlockForge core or pack components.

Each block declares:

- a stable `type`;
- its CMS label and category;
- a `viewModule` inside `src/`;
- serializable default content;
- approved editable fields.

The build runs `scripts/generate-client-extension-registry.mjs`, which generates static React imports. Arbitrary remote JavaScript is never loaded into the central CMS.

## Onboarding

1. Create a dedicated repository from the BlockForge codebase.
2. Add the custom components and manifest using `templates/client-extension`.
3. Create the client in Code mode.
4. Enter the repository, branch and its Vercel root directory (`apps/site` for the BlockForge repository structure).
5. Paste the same manifest into the onboarding form.
6. BlockForge stores the manifest with that site's content graph and exposes its fields in the editor.
7. Vercel builds the dedicated repository and statically registers its React views.

## Live editing

Code-mode sites expose `/blockforge-preview/`. BlockForge opens that route inside the existing editor canvas using a five-minute signed token. Draft content is sent directly to the iframe on every edit, so the client's real React component and compiled Tailwind styles update without a deployment or refresh. Clicking a component in the iframe selects the corresponding CMS block.

The central CMS derives a site-specific `BLOCKFORGE_PREVIEW_SECRET` from `CMS_SESSION_SECRET` and provisions only that derived secret to the client Vercel project. Client repositories never receive the CMS session secret.

## Versioning

Treat the manifest as a public contract. Do not rename a block type or field after content exists. Add a new type or field, migrate the stored content, then remove the old version in a later deployment.

## Preview fallback

If the dedicated deployment is unavailable, the editor reports that the live preview could not connect. Managed sites continue using BlockForge's in-process editor preview.
