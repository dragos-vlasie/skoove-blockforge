# BlockForge client extension starter

Use this folder as the starting point for customer-specific components in a dedicated BlockForge-based repository.

1. Copy `blockforge.extension.json` to the repository root.
2. Copy `src/client-extensions` into the repository's `src` directory.
3. Change the manifest ID, repository, component names, editable fields, defaults and module paths.
4. Run the normal BlockForge build. The prebuild script generates the site-side React registry from the manifest.
5. In **Add client**, choose **Code**, enter the dedicated repository and branch, set the Vercel root to `apps/site`, and paste the same manifest JSON.

The central CMS stores the manifest and renders controlled editing fields. The dedicated website repository owns the React implementation and renders the component in production.

Custom block types must start with `CUSTOM:` and use uppercase letters, numbers, underscores or hyphens. Every `viewModule` must point to a module inside `src/` with a default React component export.
