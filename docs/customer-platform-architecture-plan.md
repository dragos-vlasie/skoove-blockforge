# Customer Platform Architecture Plan

## Status

Proposed target architecture and delivery sequence. This document defines the decisions to implement; it does not change the running architecture by itself.

## Product goal

BlockForge is a customer-owned website platform for content-driven organisations. A customer can create an organisation, invite its team and optional agency, configure one or more sites, edit structured content, and publish to its own domains.

The product must support two delivery modes:

1. **Shared runtime:** the default product for customers using BlockForge components, themes, content models, and industry packs.
2. **Isolated runtime:** the premium path for customers that require bespoke executable code, private integrations, or stronger runtime isolation.

An agency is an optional organisation member or implementation partner. It is not required to own the customer account, and an agency is not expected to use BlockForge for every client.

## Decisions and rationale

### 1. Use one central control plane

`cms.blockforge.com` will own authentication, organisations, memberships, sites, drafts, media, billing, provisioning, audit history, and publishing.

**Why:** customers need one account across sites, and BlockForge needs one place to enforce access, billing, support, and publishing rules. Installing a complete CMS for every site would multiply upgrades, credentials, backups, and incident response.

### 2. Separate the CMS from public websites

The control plane and public site runtime will be separate deployable applications, even when maintained in one monorepo.

```text
cms.blockforge.com                  customer-domain.com
------------------                 -------------------
login and membership               published website only
draft editing                       no CMS routes
media administration               no draft access
publishing                          no platform credentials
billing and provisioning            published-content access only
```

**Why:** the public attack surface stays small, CMS code is not shipped to customer websites, and a public-site incident cannot automatically become a control-plane incident.

### 3. Keep the platform in one private monorepo

Target layout:

```text
blockforge-platform/
  apps/
    control-plane/
    site-runtime/
  packages/
    block-sdk/
    content-contracts/
    delivery-client/
    core-components/
    core-themes/
    industry-packs/
```

**Why:** the CMS, content contracts, renderer, and standard components must evolve together. A monorepo preserves atomic changes and shared tests without copying the platform for every customer.

### 4. Use the shared runtime for product capabilities, not private customer code

Shared-runtime customers can configure:

- content, media, navigation, SEO, and redirects;
- page composition and component variants;
- colours, typography, spacing, and shape tokens;
- content models, templates, locales, and categories;
- enabled and version-pinned BlockForge component packs.

New requirements are classified as follows:

1. Existing component configuration: no code change.
2. Reusable capability: add it to Core or an industry pack.
3. Customer-specific executable code: use an isolated runtime.

**Why:** allowing hundreds of tenant-specific components into the shared process would create deployment coupling, unclear ownership, and a large blast radius. Shared infrastructure should contain reviewed product code only.

### 5. Give custom customers a separate repository and deployment

A custom site repository contains only customer-specific code and a BlockForge integration manifest:

```text
customer-site/
  blocks/
  integrations/
  blockforge.manifest.ts
  tests/
```

It imports the supported BlockForge SDK and delivery client. It does not contain the control-plane source.

**Why:** developers need a normal code workflow, customers may require source access, and bespoke code must not execute inside the shared runtime. The customer repository can be customer-owned, agency-owned with customer access, or BlockForge-managed according to the contract.

### 6. Define ownership explicitly

- BlockForge owns the control plane, shared runtime, SDK, Core, and BlockForge-funded packs.
- The customer owns its content, media, domain, and brand assets and can export them.
- Ownership or licensing of commissioned bespoke components is stated in the order form; the recommended default is customer source access.
- Agencies receive delegated membership. They do not automatically own the organisation or its data.

**Why:** unclear ownership creates sales friction and makes offboarding dangerous. Product IP and customer assets must have different rules.

### 7. Keep global credentials inside the control plane

No customer website may receive:

- the platform database URL;
- a Supabase secret or service-role key;
- a token that can read drafts;
- a deployment credential for another site.

An isolated site receives only:

```text
BLOCKFORGE_SITE_ID
BLOCKFORGE_DELIVERY_URL
BLOCKFORGE_DELIVERY_TOKEN
```

The delivery token is revocable, stored hashed at rest, and restricted to `read:published` for one site. The shared runtime also uses the published-only delivery interface after resolving the hostname; it does not receive a broad database identity. Browsers do not receive draft or platform credentials.

**Why:** the current provisioning code sends the shared database URL and Supabase secret to every Netlify site. A compromise of one deployment could therefore expose all tenants. Supabase secret/service credentials bypass RLS and must remain server-only.

### 8. Use one Supabase project initially, protected by membership-based RLS

All customer-owned records include `organisation_id` and, where relevant, `site_id`. Every exposed table has explicit grants and RLS policies. Policies verify membership and required role; `TO authenticated` alone is not sufficient authorisation.

Roles:

- `owner`: billing, ownership, domains, members, and all site actions;
- `admin`: members, configuration, content, and publishing;
- `developer`: component manifests, integrations, previews, and deployment configuration;
- `editor`: content, media, and publishing according to site policy;
- `viewer`: read-only workspace and preview access;
- `platform_admin`: BlockForge operations, stored in the database rather than user-editable metadata.

Use database membership records for authorisation. Do not use `user_metadata`, and do not put the full membership list in JWT claims because membership changes must take effect without waiting for token refresh.

**Why:** one project is operationally efficient while RLS gives defence in depth. Dedicated Supabase projects remain an optional enterprise isolation tier, not the default architecture.

### 9. Store editable content per document and publish immutable releases

The target data model is:

```text
auth.users
organisations
organisation_members
sites
site_domains
site_members
invitations

content_items
content_versions
published_releases
release_items

assets
component_pack_installations
delivery_credentials
deployments
audit_events
subscriptions
```

Use **organisation** in the product and API language. Existing `tenant_id` columns can remain as an internal compatibility name during migration; renaming them is not a prerequisite for securing or launching the architecture.

Draft pages and entries are independent records with optimistic version checks. Publishing creates an immutable release manifest referencing exact content versions. Public delivery reads only a published release.

**Why:** the current whole-site `graph_json` snapshot is useful as a compatibility format but causes unnecessary rewrites and concurrency risk when multiple editors change different documents. Immutable releases give deterministic rendering, rollback, and cache invalidation.

### 10. Provision through retryable jobs

Organisation creation, starter seeding, imports, domain verification, storage preparation, and isolated deployments are separate idempotent jobs with recorded states.

**Why:** a synchronous chain of external API calls produces partial failures that are hard to retry. The customer account and organisation should remain usable while a domain or deployment step is retried.

## Target request and publishing flows

### Authentication and workspace access

```text
User signs in with Supabase Auth
  -> control plane validates the server-side session
  -> membership query selects accessible organisations/sites
  -> route/API checks required role
  -> RLS independently restricts the same database operation
```

### Shared public site

```text
Custom domain
  -> shared runtime resolves site_domains
  -> reads the active published release
  -> renders with the site's pinned component packs and theme
  -> caches by site + release ID + path
```

### Isolated public site

```text
Customer deployment
  -> site-scoped delivery token
  -> published delivery endpoint
  -> active release only
  -> local rendering with custom components
```

### Preview

```text
Authorised editor
  -> control plane issues a short-lived, site-scoped preview token
  -> runtime renders the requested draft/version in an iframe
  -> token cannot list other sites or publish content
```

## What the current repository already provides

Preserve and evolve:

- tenant and site records;
- central workspace selection;
- Supabase Auth integration;
- owner/admin/editor/viewer concepts;
- block definitions, generated fields, previews, and public views;
- themes, starters, packs, templates, validation, SEO, and redirects;
- WordPress discovery and migration pipeline;
- draft/published separation and content version recording;
- Vercel provisioning as the primary isolated-runtime provider, with Netlify retained for legacy sites.

Replace or constrain:

- shared database and Supabase secret injection into client deployments;
- CMS and public routes in the same deployment;
- whole-site graph writes as the long-term editor store;
- synchronous all-or-nothing provisioning;
- production platform-admin access through environment email lists or the legacy password;
- public-site access to draft-capable storage interfaces.

## Delivery plan

### Phase 0: Establish the migration baseline

1. Record every current CMS and public deployment, credential, domain, and content backend.
2. Back up the current content database and verify a restore before schema migration work.
3. Standardise local development, CI, and hosting on Node.js 22 or later before the next Supabase client upgrade.
4. Confirm which Supabase schemas are exposed through the Data API and use explicit grants rather than relying on project defaults.
5. Add architecture decision records for the control-plane boundary, delivery contract, and shared-versus-isolated runtime rule.

**Exit criteria:** the team can identify every deployment using the shared credentials, restore the current database, and reproduce the supported runtime in CI.

### Phase 1: Close the credential and delivery boundary

1. Add a published-content delivery contract that cannot return drafts.
2. Add site-scoped, revocable delivery credentials for isolated runtimes.
3. Change hosting provisioning to send only site ID, delivery URL, and site token.
4. Remove database and Supabase secret requirements from public deployments.
5. Rotate the shared credentials after all existing deployments stop using them.
6. Add cross-tenant tests proving that one site token cannot access another site or any draft.

**Exit criteria:** inspecting a public deployment reveals no platform database or Supabase secret; a site credential reads only that site's active release.

### Phase 2: Establish deployable application boundaries

1. Extract shared content contracts, renderer primitives, and block registry interfaces into packages.
2. Move `/cms` and `/api/cms` ownership into `apps/control-plane`.
3. Move public routing and rendering into `apps/site-runtime`.
4. Deploy the two applications independently.
5. Add hostname-to-site resolution for shared-runtime domains.

**Exit criteria:** the public runtime can be built and deployed without CMS routes, Supabase Auth administration, or draft-storage credentials.

### Phase 3: Harden tenancy and customer onboarding

1. Consolidate Auth, membership, content, and storage boundaries in Supabase Postgres.
2. Add organisation creation, invitations, acceptance, revocation, ownership transfer, and site-level access.
3. Add explicit RLS grants and operation-specific policies for every exposed table.
4. Add pgTAP/RLS tests for owner, admin, developer, editor, viewer, non-member, and platform admin.
5. Remove the production legacy password and environment-email administrator path after a controlled migration.
6. Add separate draft/private and published/public media rules.

**Exit criteria:** a non-member cannot discover a tenant; role downgrades take effect reliably; storage writes and replacements are tenant/site scoped.

### Phase 4: Move editing to document-level storage

1. Introduce content item and per-item version tables alongside the existing graph snapshot.
2. Add a compatibility adapter that can read/write the current `ContentGraph` during migration.
3. Move pages, entries, navigation, shared blocks, redirects, and site settings incrementally.
4. Add optimistic concurrency checks and conflict responses.
5. Create immutable published releases and release manifests.
6. Add restore and rollback from content versions/releases.
7. Retire whole-graph draft writes after parity and migration verification.

**Exit criteria:** two editors can update different documents without overwriting each other; a previous release can be restored deterministically.

### Phase 5: Productise the shared runtime

1. Define stable versioned contracts for components, fields, themes, and pack manifests.
2. Pin enabled pack versions per site.
3. Add compatibility checks before a pack upgrade.
4. Add staged rollout and rollback for shared-runtime releases.
5. Add per-site cache invalidation using the published release ID.
6. Confirm that all standard customer variation is represented as content, configuration, or reviewed reusable components.

**Exit criteria:** a platform deployment can be rolled back, and one site's configuration cannot enable an unapproved pack or component.

### Phase 6: Support custom code safely

1. Publish a supported BlockForge SDK and delivery client.
2. Create the customer-site starter repository and component manifest format.
3. Define the contract that gives the CMS field definitions without executing customer code in the control plane.
4. Render custom previews through the isolated runtime iframe.
5. Add CI checks for schema compatibility, build success, accessibility smoke tests, and dependency risk.
6. Provision a separate hosting project and site-scoped delivery token.
7. Document repository ownership, source access, deployment access, and offboarding.

**Exit criteria:** a developer can add a bespoke component without changing or deploying the control plane, and the isolated runtime cannot access another customer's data.

### Phase 7: Complete commercial operations

1. Add plans, subscriptions, entitlements, trials, and usage limits.
2. Add idempotent provisioning jobs, retries, and an operator queue.
3. Add domain verification, SSL state, deployment health, and publish status.
4. Add audit events for membership, publishing, credentials, domains, and billing changes.
5. Add customer export, deletion, retention, backup, and restore procedures.
6. Add operational monitoring by organisation, site, release, and deployment.

**Exit criteria:** customer onboarding, normal publishing, failed-job recovery, export, and offboarding can be completed without direct database editing.

## Security acceptance tests

Before production customer onboarding, verify:

- Customer A cannot select, update, or delete Customer B records through APIs or direct Data API access.
- A site-scoped delivery token cannot return drafts or another site's release.
- The public runtime contains no database password, Supabase secret/service key, CMS session secret, or cross-site deployment credential.
- A removed member loses access after session refresh; sensitive operations can enforce current session validity.
- Storage upload, replacement, listing, and deletion policies enforce tenant/site scope.
- Preview tokens expire, are site scoped, and cannot publish.
- Published delivery stays available if the control-plane UI is unavailable.
- Rollback restores an exact immutable release.
- Views use `security_invoker` or are kept out of exposed schemas.
- Privileged functions are not publicly executable and are reviewed with database advisors.

## Main trade-offs

### Shared runtime

**Strength:** lowest cost, fastest onboarding, consistent upgrades, and the clearest product experience.

**Weakness:** a bad shared release has a wider blast radius.

**Mitigation:** version-pinned packs, staged rollout, release health checks, and fast rollback.

### Isolated runtime

**Strength:** bespoke code, clearer source ownership, private integrations, and smaller runtime blast radius.

**Weakness:** more deployments, upgrades, and support paths.

**Mitigation:** one supported starter, SDK contract, automated CI, and premium pricing.

### Central Supabase project

**Strength:** simpler authentication, membership, support, analytics, and operations.

**Weakness:** logical rather than physical data isolation for standard customers.

**Mitigation:** RLS, explicit grants, automated cross-tenant tests, server-only secrets, audit logs, and an optional dedicated enterprise environment later.

## Explicitly deferred alternatives

These are not part of the initial target:

- a separate Supabase project for every standard customer;
- a fork of the entire BlockForge repository per customer;
- arbitrary customer code loaded dynamically into the shared runtime;
- direct browser access to draft content tables;
- automatic conversion of every bespoke request into a permanent Core feature;
- a promise that agencies will standardise every client on BlockForge.

## Recommended implementation order

Do not begin with the monorepo split or billing. First close the credential boundary, because the current client-deployment secret model is the material security risk. Then separate deployables, harden tenancy, migrate content storage, productise the shared runtime, and finally add the supported custom-code path.

The sequence is therefore:

```text
migration baseline
  -> secure delivery
  -> separate applications
  -> self-service tenancy
  -> document-level content and releases
  -> shared runtime hardening
  -> isolated custom-code workflow
  -> commercial operations
```
