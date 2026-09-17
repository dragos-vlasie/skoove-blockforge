# BlockForge deployment architecture

BlockForge uses one GitHub monorepo with separate deployable applications.

## Vercel projects

| Project | Root directory | Purpose | Secrets |
| --- | --- | --- | --- |
| `blockforge-admin` | `apps/admin` | Central CMS, client access, provisioning and deployment management | Database, Supabase server key, Vercel token, platform-admin configuration |
| `blockforge-{client}` | `apps/site` | One public website for a managed client | Tenant/site identifiers and the central BlockForge API URL only |

In each Vercel project's Root Directory settings, keep **Include source files outside of the Root Directory in the Build Step** enabled while the workspace packages and compatibility imports live at repository level.

Existing externally hosted websites, such as Vietdaily, do not need a BlockForge Vercel project.

## Repository layout

```text
apps/admin   Central CMS and administrative API routes
apps/site    Public website routes only
packages/core
packages/blocks
packages/packs
packages/themes
```

The original root application remains temporarily available while deployments migrate. The workspace packages provide stable import boundaries over the existing shared implementation; implementation files can move behind those boundaries incrementally.

## Commands

```sh
npm run dev:admin
npm run dev:site
npm run build:admin
npm run build:site
npm run typecheck:workspaces
```

The admin app runs on port `3001` and the site app on `3002` during local development.

## Migration order

1. Deploy `apps/admin` as the dedicated central platform project.
2. Configure central-only secrets on that project.
3. Keep the existing Pilot project online while validating `apps/site`.
4. Change Pilot's Vercel Root Directory to `apps/site` and redeploy without changing its domains.
5. Provision all new managed clients from `apps/site`.

Client projects never receive the database connection, Supabase server key, Vercel provisioning token, or platform-admin configuration. The site runtime reads only published content through the admin application's `/api/public/content` endpoint and forwards analytics to `/api/public/views`.

Published-content responses exclude drafts, archived content, custom blueprints, blueprint assignments, unreferenced media records, and private media storage paths. Client projects use `CMS_CONTENT_STORE=remote`; editing and publishing remain central-only operations.
