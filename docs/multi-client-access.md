# Multi-client CMS access

`/cms/` is the website management dashboard. It lists every workspace the signed-in user can access, together with deployment state, development mode, content totals, and the last published date. A route such as `/cms/pilot/?site=main` opens one tenant/site pair, and every CMS API request verifies that pair before reading or writing content.

## Access levels

- `platform_admin`: all clients and sites
- `owner`: workspace ownership, billing, members, development, and content
- `manager`: manage members, development, settings, and content
- `developer`: builder tools, components, models, integrations, and content
- `admin`: legacy alias for manager access
- `editor`: read, edit, upload, and publish
- `viewer`: read-only API access

Builder mode is role-based. Platform administrators, owners, managers, developers, and legacy admins see builder tools. Editors and viewers stay in client mode and only see approved component packs and fields.

The existing `CMS_ADMIN_PASSWORD` login remains a platform-admin bootstrap and fallback. For named accounts, create the user in Supabase Auth and configure:

```env
CMS_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
CMS_PLATFORM_ADMIN_EMAILS=admin@example.com
```

`CMS_PLATFORM_ADMIN_EMAILS` is the easiest way to bootstrap the first administrator. For database-managed platform administrators, insert the Supabase Auth user ID:

```sql
insert into cms_platform_admins (user_id, email)
values ('SUPABASE-AUTH-USER-UUID', 'admin@example.com');
```

Grant a user access to one client:

```sql
insert into cms_tenant_members (tenant_id, user_id, email, role)
values ('pilot', 'SUPABASE-AUTH-USER-UUID', 'editor@example.com', 'editor')
on conflict (tenant_id, user_id)
do update set email = excluded.email, role = excluded.role, updated_at = now();
```

## Database boundary

The current content database is local PostgreSQL, while Auth and Storage use the hosted Supabase project. The app therefore enforces roles in every CMS route handler. The migration in `supabase/migrations/` also contains RLS policies that activate automatically when the content tables are moved into a Supabase Postgres database with `auth.uid()` available.

Use the repo-pinned CLI for migrations:

```sh
npx supabase migration list --linked
npx supabase db push --dry-run --linked
```

Do not push the current migration to the hosted project until the CMS content tables have been migrated there; it references `cms_tenants`, `cms_sites`, and the content/analytics tables.

## Add client provisioning

Platform administrators see **New website** on `/cms/`. Provisioning is server-only and requires:

```env
CMS_APP_URL=https://cms.example.com
BLOCKFORGE_CONTENT_API_URL=https://cms.example.com
CMS_DATABASE_URL=postgresql://...
CMS_SUPABASE_URL=https://PROJECT.supabase.co
CMS_SUPABASE_SECRET_KEY=sb_secret_...
CMS_SUPABASE_STORAGE_BUCKET=cms-media
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
CMS_DEPLOYMENT_PROVIDER=vercel
VERCEL_ACCESS_TOKEN=...
VERCEL_GIT_REPOSITORY=owner/repository
VERCEL_GIT_BRANCH=master
VERCEL_ROOT_DIRECTORY=apps/site
VERCEL_CODE_ROOT_DIRECTORY=apps/site
VERCEL_PROJECT_NAME_PREFIX=blockforge
```

`BLOCKFORGE_CONTENT_API_URL` is the public URL of the central BlockForge deployment. It may be the same value as `CMS_APP_URL`. Provisioned client projects receive that URL plus `CMS_TENANT_ID` and `CMS_SITE_ID`; they do not receive the database URL or Supabase server key.

`VERCEL_GIT_REPOSITORY` is required only when creating a new managed Vercel project. An optional existing Vercel Project ID or name connects that project and keeps its current repository configuration. Personal Hobby accounts do not need `VERCEL_TEAM_ID`; add `VERCEL_TEAM_ID` and `VERCEL_TEAM_SLUG` when provisioning into a team. The central CMS stores only project and deployment identifiers in `cms_site_deployments`; it never stores the Vercel access token in Postgres.

The repository is an npm workspace. Deploy the central management platform from `apps/admin`; managed client Vercel projects use `apps/site`. See `docs/deployment-architecture.md` for the project and secret boundary.

The onboarding form supports two development modes:

- `managed`: uses `VERCEL_GIT_REPOSITORY` and `VERCEL_GIT_BRANCH` for the shared BlockForge codebase.
- `code`: requires a dedicated `owner/repository` and branch, or an existing Vercel Project whose repository is already configured. It uses the root directory entered during onboarding; `VERCEL_CODE_ROOT_DIRECTORY` is only the default when the form is left blank.

For a customer that needs private React components, create a dedicated BlockForge-based repository and follow [Client extensions](./client-extensions.md). Paste its committed `blockforge.extension.json` into the Code-mode onboarding form so the CMS can expose only the approved fields.

Provisioning creates or connects the Vercel project, sets its Root Directory for the selected development mode, removes legacy database/Supabase credentials from the client project, upserts its site-specific environment variables, attaches the custom domain, and starts a production deployment. The Vercel GitHub App must have access to every repository used by provisioning. Keep `CMS_DEPLOYMENT_PROVIDER=netlify` and the existing `NETLIFY_*` variables only if a legacy site still uses Netlify.

The custom domain is optional during onboarding. Without one, the website launches on the URL returned by the first Vercel deployment. If a custom domain is supplied, BlockForge attaches it to the project; DNS or ownership verification may still need to be completed from the project's Vercel domain settings.

The client owner is always invited as `owner`. An optional developer email is invited as `developer`. Platform administrators retain access to every workspace regardless of membership.
