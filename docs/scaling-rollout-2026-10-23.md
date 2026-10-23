# Publish-only cache upgrade — 23 October 2026

Upgrade this installation's deployed scoped-content cache to signed publication invalidation and bounded expired-release recovery. Remove timed page, sitemap and robots refreshes. Use the complete compact route index for sitemap/build enumeration.

Preserve the Skoove extension, custom templates/chrome, styles, legacy `/blog` path aliases and content. Its existing scoped delivery contract remains unchanged; this release does not opt custom templates into SQL archive slices.

Configure `BLOCKFORGE_REVALIDATION_SECRET` with this workspace's derived secret before deploying. The CMS origin, tenant and site must match the protected deployment binding. The central CMS must expose publication protocol 1. Verify a signed refresh after deployment; current content and drafts must remain unchanged.

Verification: local TypeScript and production site build passed. Shared publication protocol, expired-release recovery and real Next publish-only cache behavior were tested in the CMS release. The custom-view data-contract migration remains separate.

The staged build exposed a timeout while pre-rendering 1,613 URLs. Builds now verify/warm the homepage and complete sitemap/robots; other routes render on first visit and remain cached until publishing. One build worker and at most two concurrent static tasks avoid a full-site request burst. First uncached visits require a healthy CMS. Local typecheck/build and the shared real Next first-visit/cache/outage integration passed.
