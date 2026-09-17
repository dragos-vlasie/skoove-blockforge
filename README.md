# blockforge-cms

BlockForge is a Next.js website with a protected React CMS. The CMS edits structured JSON content; Next.js renders the public routes and CMS from one application.

WordPress discovery and semantic content conversion are documented in [`docs/migrations/wordpress.md`](docs/migrations/wordpress.md).

Reusable locale routing and translation support are documented in [`docs/localization.md`](docs/localization.md).

Platform-admin, client switching, Supabase Auth, and tenant roles are documented in [`docs/multi-client-access.md`](docs/multi-client-access.md).

## Base CMS Product

The base CMS is for building normal websites first:

- choose a starter
- edit site name, logo, colors, fonts, SEO defaults, header, and footer
- create pages
- add/reorder page blocks
- upload and reuse media
- publish

Advanced content models are optional. Use them only when a site needs repeatable content such as a blog, products, team members, tours, cars, docs, or case studies.

Business app data is not part of the base page builder. Things like bookings, customers, payments, inventory, and availability should be implemented as optional app modules backed by their own database tables.

Starters live in `src/starters/`. A starter can seed pages, navigation, theme tokens, and optional content models without changing the block registry.

Current core starters:

- `blank`
- `blog`
- `launch-saas`
- `studio-agency`
- `journal-blog`
- `agency`
- `portfolio`
- `local-business`

Starters must compose reusable blocks, block presets, and templates. They should not introduce one-off hardcoded page designs. Header and footer are global navigation chrome seeded through `navigation`, while page content is built from registered blocks such as Hero, Logo Cloud, Feature Bento, Image/Text, Testimonials, Pricing, FAQ, CTA, Blog Grid, and Contact Form.

Core split:

- `src/ui` is shared UI primitives.
- `src/cms` is editor/admin UI only.
- `src/next` is the public website renderer and route resolver.
- `src/blocks` is reusable website sections.
- `src/blocks/presets.ts` is reusable section preset builders.
- `src/themes` is reusable design presets and approved font choices.
- `src/templates` is page and entry layouts.
- `src/starters` is ready-made websites.
- `src/apps` is reserved for optional business modules.

Rule of thumb:

- Block = section.
- Preset = ready-made version of a section.
- Template = page layout.
- Starter = full ready-made website.
- App = business logic.

Interactive primitives should come from `src/ui`, which wraps Radix where needed. Static marketing blocks should not hydrate on the public site. Use hydration only for interactive blocks such as Accordion, Tabs, Dialog, Dropdown, Select, Navigation Menu, or Switch-style controls.

Theme presets live in `src/themes/registry.ts`. Starters should pick a theme preset instead of hard-coding random colors and fonts. Editors can still override colors, fonts, and radius in the CMS setup/settings screens.

### Component Styling Rule

All new public and CMS components must use Tailwind CSS utility classes. Do not introduce new component-specific CSS, Sass, CSS Modules, styled-components, or Emotion styles. Keep `src/styles/public.css` for Tailwind imports, global design tokens, resets, and accessibility rules only.

Existing CMS rules in `src/styles/editor.css` are grandfathered. New CMS components must use Tailwind, and touched legacy component styles should be migrated when practical. Inline styles are reserved for genuinely dynamic runtime values or CSS custom properties.

## Client Website Setup

New client sites should start from the CMS **Setup Website** flow.

The setup flow is builder-facing. It is meant for the person creating the client website, not for public visitors.

It covers the project-specific details that should be unique per client:

- starter: Blank, Blog, Launch SaaS, Studio Agency, Journal Blog, Agency, Portfolio, Local Business, or future vertical starters
- identity: site name, organization name, logo, favicon, default OpenGraph image
- domain: production `siteUrl`
- SEO defaults: locale, title pattern, default description
- brand: primary color, accent color, background, text color, fonts, corner radius
- content seed: starter pages, navigation, theme tokens, and optional content models

The flow applies the selected starter and then overrides it with the client settings. Existing extra content is kept, so setup can be rerun later to adjust brand or starter defaults without deleting custom pages.

Platform administrators can use **New website** on `/cms/` to provision the complete client workspace. The flow:

- creates the tenant and main site in one database transaction
- seeds matching draft and published snapshots from the selected starter and theme
- invites or connects the owner's Supabase Auth account
- optionally invites a developer with role-based Builder mode access
- creates the tenant/site prefix in the configured public Supabase Storage bucket
- creates a managed Vercel project from the shared repository, connects a dedicated Code-mode repository, or connects an existing project ID/name
- configures the site's tenant, database, Auth, media, and private build-hook environment
- starts the first Netlify build

Configure `CMS_APP_URL`, the Supabase server credentials, and the `VERCEL_*` variables from `.env.example` on the central CMS deployment. `VERCEL_ACCESS_TOKEN` stays on the central CMS and is never copied into client projects.

Workspace roles determine the interface: owners, managers, developers, legacy admins, and platform administrators receive Builder mode; editors and viewers receive Client mode. Managed sites use the shared BlockForge repository. Code-mode sites use a dedicated repository or a separately configured existing Vercel project.

If Vercel provisioning fails after the workspace transaction commits, the client remains in the dashboard and the deployment record is marked `failed` with the error. This avoids losing the successful tenant, Auth, and content setup. Set `CMS_DEPLOYMENT_PROVIDER=netlify` only for legacy Netlify provisioning.

## Project Architecture

The project is split into five main layers:

- `content/` is the source of truth for CMS data.
- `src/blocks/` is the page component registry.
- `src/cms/` is the protected editor UI.
- `app/` defines Next.js pages and route handlers; `src/next/` renders the public website.
- `src/lib/cms/` owns storage, routing, validation, auth, media, and SEO helpers.

### Content Layer

CMS content lives as JSON files:

- `content/draft/` is what editors are currently changing.
- `content/published/` is what the public website renders.
- `content/*/pages/` stores normal pages.
- `content/*/collections/` stores collection definitions.
- `content/*/entries/` stores collection entries.
- `content/*/categories/` stores optional grouping pages.
- `content/*/navigation/` stores header/footer menus.
- `content/*/site.json` stores global site metadata.
- `content/*/_meta.json` stores ordering and file indexes.

Pages and collection entries contain `blocks`. A block is only JSON:

```json
{
  "id": "block-example",
  "type": "FAQ",
  "content": {
    "headline": "Frequently Asked Questions",
    "items": []
  }
}
```

The block `type` decides which registered component renders it.

### CMS Layer

The CMS app is mounted from `app/cms/page.tsx` and mostly lives in:

- `src/cms/VisualPageEditor.tsx` for the visual page editing surface.
- `src/cms/blockEditor.tsx` for generated block fields.
- `src/cms/adminPanels.tsx` and `src/cms/contentPanels.tsx` for management screens.
- `src/cms/useCmsController.ts` for editor state and save/publish actions.

The editor does not hard-code block fields. It reads field config from each block's `definition.ts`.

### Public Website Layer

Public pages are Next.js App Router routes:

- `app/[[...slug]]/page.tsx` resolves the home page, pages, entries, collection indexes, and categories.
- `src/next/BlockRenderer.tsx` dispatches each JSON block to its shared React view.
- `src/next/Templates.tsx` renders page, article, author, collection, and category templates.
- `src/next/PublicSite.tsx` owns public site chrome, metadata, and structured data.

Public components should stay as server components by default. Add `"use client"` only when a component needs browser state or event handlers.

### Storage Layer

CMS content goes through `src/lib/cms/contentStore.ts`, which delegates to a storage backend:

- `CMS_CONTENT_STORE=local` reads/writes `content/draft` and `content/published`.
- `CMS_CONTENT_STORE=github` reads/writes the same JSON format through GitHub commits.
- `CMS_CONTENT_STORE=database` reads/writes draft and published `jsonb` snapshots in Postgres.

Storage implementations live in `src/lib/cms/storage/`.

The app should call the content store interface, not GitHub or local files directly:

```ts
contentStore.saveDraft(graph)
contentStore.publish(graph)
contentStore.getDraft()
contentStore.getPublished()
```

Database storage uses a generic Postgres driver, so it can point at Supabase, Neon, Railway, or any normal Postgres connection string. Use `CMS_DATABASE_URL` or `DATABASE_URL`, plus `CMS_TENANT_ID` and `CMS_SITE_ID`.

The database store keeps the same CMS graph shape, but stores it in Postgres:

```txt
cms_content_snapshots
  tenant_id
  site_id
  status: draft | published
  graph_json: jsonb
  version
```

Each save/publish also appends to `cms_content_versions` for history. The SQL schema lives in `database/cms-content-store.sql`; by default the store can auto-create these tables with `CMS_DATABASE_AUTO_MIGRATE=true`.

For Netlify static publishing with database storage, set `CMS_PUBLISH_WEBHOOK_URL` to a Netlify build hook. Without a build hook, publish saves the database snapshot, but the public static site will not update until the next deploy. Draft and published database snapshots are committed in one transaction. The deployment hook runs only after that transaction commits; if it fails, the CMS reports that content was published but deployment was not triggered.

The page editor offers both **Publish page** and **Publish all**. Page publishing saves the complete working graph as the draft snapshot, then promotes only the selected page and media records referenced by that page into the public snapshot. Other pages, navigation, entries, shared blocks, redirects, and site settings stay at their previously published versions. Publishing a page marks that page as published; a new shared block must be published with **Publish all** before a page can reference it publicly.

Minimal database env:

```env
CMS_CONTENT_STORE=database
CMS_DATABASE_URL=postgresql://...
CMS_TENANT_ID=client-name
CMS_SITE_ID=main
CMS_DATABASE_SSL=require
CMS_DATABASE_AUTO_MIGRATE=true
CMS_PUBLISH_WEBHOOK_URL=https://api.netlify.com/build_hooks/...
```

For Supabase Free, use the Supabase Postgres connection string as `CMS_DATABASE_URL`. If the URL already includes `sslmode=require`, `CMS_DATABASE_SSL` can be left empty; otherwise set `CMS_DATABASE_SSL=require`.

Dynamic app data such as bookings, customers, payments, and availability should live outside this page-content snapshot store.

### Validation And Media

Validation lives in `src/lib/cms/validation.ts`.

Media helpers and CMS upload/check/replace endpoints live in:

- `src/lib/cms/media.ts`
- `app/api/cms/media/upload/route.ts`
- `app/api/cms/media/check/route.ts`
- `app/api/cms/media/replace/route.ts`
- `app/api/cms/media/delete/route.ts`

Media storage can be local, GitHub-backed, or Supabase Storage-backed:

```env
CMS_MEDIA_STORE=local
```

Use `local` for development uploads into `public/uploads`. Use `github` when media should be committed into the repo with content. Use `supabase` when media should live outside Git and be served from Supabase Storage.

Supabase media env:

```env
CMS_MEDIA_STORE=supabase
CMS_SUPABASE_URL=https://your-project.supabase.co
CMS_SUPABASE_SECRET_KEY=your-server-only-secret-key
CMS_SUPABASE_STORAGE_BUCKET=cms-media
```

Use the new Supabase `Secret keys` value from Project Settings > API Keys. Do not use the publishable key for uploads. The legacy `service_role` key still works as a fallback through `CMS_SUPABASE_SERVICE_ROLE_KEY`, but new projects should use `CMS_SUPABASE_SECRET_KEY`.

Create the `cms-media` bucket in Supabase Storage and make it public if the public website should render images directly from Supabase URLs. Uploaded objects are stored under `tenant/site/year/file.ext`, using `CMS_TENANT_ID` and `CMS_SITE_ID`.

When a new block introduces image fields, add those image references to validation and media checking so broken URLs are caught.

## Block Architecture

Blocks are the reusable page components in this CMS. They are not just React components. A CMS block has:

- a content model
- default content
- validation schema
- generated editor fields
- CMS preview renderer
- public website renderer

Each block should live in its own folder:

```txt
src/blocks/
  faq/
    definition.ts
    View.tsx
    Preview.tsx
```

Use this responsibility split:

- `definition.ts` owns the model, default content, Zod schema, label, short label, order, and editor fields.
- `View.tsx` owns shared stateless markup when preview and public output should match.
- `Preview.tsx` is the CMS preview wrapper. Put CMS-only behavior here.
- `View.tsx` is also the public renderer registered in `src/blocks/nextRegistry.tsx`.

Public blocks should stay static by default. If a block needs state only in the CMS, keep that state out of the shared public view.

If a public block needs browser state, make only that view a client component:

```tsx
"use client";

export function FaqView({ content }: { content: any }) {
  // interactive view
}
```

Do not hydrate static marketing blocks just because they are written in React.

## How To Add A New Block

Adding a block should mostly mean adding a new folder under `src/blocks/`.

### 1. Add The Block Type

Add the new enum value in `types.ts`:

```ts
export enum BlockType {
  FAQ = "FAQ",
}
```

The enum is the stable contract stored in JSON. Do not rename it casually after content exists.

### 2. Create The Folder

Create:

```txt
src/blocks/my-block/
  definition.ts
  View.tsx
  Preview.tsx
```

The `predev` and `prebuild` scripts automatically regenerate the static block registry from `definition.ts`, `View.tsx`, and `Preview.tsx` files.

### 3. Write `definition.ts`

Example:

```ts
import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const faqBlock = {
  type: BlockType.FAQ,
  label: "FAQ",
  shortLabel: "Q",
  order: 40,
  defaultContent: {
    tagLine: "Have Questions?",
    headline: "Frequently Asked Questions",
    items: [{ question: "Question?", answer: "Answer." }],
  },
  schema: z.object({
    tagLine: optionalString,
    headline: z.string(),
    items: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })),
  }).passthrough(),
  fields: [
    { id: "tagLine", label: "Tag Line", type: "text" },
    { id: "headline", label: "Headline", type: "text" },
    {
      id: "items",
      label: "FAQ Items",
      type: "repeater",
      addLabel: "Add FAQ",
      defaultItem: { question: "Question?", answer: "Answer." },
      fields: [
        { id: "question", label: "Question", type: "text" },
        { id: "answer", label: "Answer", type: "textarea", rows: 4 },
      ],
    },
  ],
} satisfies BlockDefinition;

export default faqBlock;
```

Rules for definitions:

- `type` must match the enum in `types.ts`.
- `defaultContent` must be valid according to `schema`.
- `fields` must match real keys in `defaultContent`.
- Use `repeater` for arrays.
- Use `image` for image URL fields so the media picker can work.
- Keep labels human-readable; they are used in the editor UI.
- Use `order` to control where the block appears in the component library.

### 4. Write `View.tsx`

`View.tsx` should be a plain render component:

```tsx
export function FaqView({ content }: { content: any }) {
  return <section>{content.headline}</section>;
}
```

Rules for views:

- Prefer stateless markup.
- Read everything from `content`.
- Do not import CMS state.
- Do not call CMS APIs.
- Do not assume the block is only used on one page.
- Use plain links and images unless the block has a real reason not to.

### 5. Write `Preview.tsx`

For most blocks:

```tsx
import { FaqView } from "./View";

export function Preview({ content }: { content: any }) {
  return <FaqView content={content} />;
}
```

Only add CMS-only preview behavior here if needed.

### 6. Register the block

Run `npm run build` or `npm run dev`. The pre-script regenerates `src/blocks/nextRegistry.tsx`, making the shared `View.tsx` available to both the public renderer and CMS preview system. Keep the view server-compatible unless it requires browser state.

### 7. Add Validation For Special Fields

If the block has images, URLs, nested blocks, or references to shared content, update `src/lib/cms/validation.ts`.

Example cases:

- image URL is invalid
- local uploaded image is missing
- image alt text is missing
- shared block reference is missing
- nested layout is not allowed

### 8. Add Media Reference Checks

If the block has image fields, update `app/api/cms/media/check/route.ts` so the media checker can find those URLs.

This matters because otherwise a block can render a broken image without the CMS knowing.

### 9. Use The Block In Content

Add the block to a page JSON:

```json
{
  "id": "block-faq",
  "type": "FAQ",
  "content": {
    "tagLine": "Have Questions?",
    "headline": "Frequently Asked Questions",
    "items": []
  }
}
```

After that, the block appears in the CMS and renders publicly through the registry.

## Shared Blocks

Shared blocks are reusable CMS-managed block instances. Use them when the same content should appear on many pages and update everywhere at once.

Good examples:

- newsletter CTA
- repeated pricing CTA
- testimonial section
- guarantee banner
- reusable FAQ group

Do not use shared blocks for structured business data like cars, addons, locations, or bookings. Those should be collections or app data.

Rule of thumb:

- Block: reusable design section.
- Shared block: reusable design section with shared content.
- Collection: reusable structured content items.
- App data: dynamic operational data such as bookings and payments.

## Template Architecture

Templates are reusable public layouts for whole content types. They are different from blocks:

- Blocks render page sections.
- Templates render the outer shape of pages, entries, collection indexes, and category pages.
- Collections can choose one entry template and one index template.
- Individual pages or entries can override their template when needed.

Core templates live in:

```txt
src/templates/
  registry.ts
src/next/
  Templates.tsx
```

Current system templates:

- `landing-page` for normal CMS pages and block-first landing pages.
- `article-standard` for editorial posts, guides, reviews, and imported blog articles.
- `author-profile` for author, team member, or expert profile entries.
- `blog-index` for public collection listing pages.
- `category-index` for public topic/category listing pages.

Template fields are optional in JSON:

```json
{
  "templateId": "article-standard"
}
```

Collection definitions can set defaults:

```json
{
  "entryTemplateId": "article-standard",
  "indexTemplateId": "blog-index"
}
```

If these fields are missing, the template registry picks safe defaults. This keeps old content working while allowing blog imports to assign one article template to hundreds of posts.

## Collections Versus Blocks

Use collections for repeatable content records:

- cars
- addons
- articles
- products
- tours
- team members

Use blocks for page sections:

- hero
- FAQ
- gallery
- CTA
- feature list
- two-column layout

Example:

- A car is a collection entry because it has data: name, price, seats, transmission, image.
- A car grid is a block because it decides how car entries are displayed on a page.
- A booking form is an app component because it has user state, validation, availability, and submission logic.

## Component Packs

### Core foundation quality control

Builder mode exposes `/cms/foundation`, a visual matrix for the 15 dependable core components. It compares the same component and variant across Editorial Travel, Clean SaaS, and Studio Agency at desktop, tablet, and mobile widths. Use this page before adding a new theme, changing a semantic recipe, or declaring a pack compatible with all themes.

Industry packs may add specialised components and content models, but they must keep using the semantic design contract. They do not replace the core foundation.

Component packs group reusable page-building sections without coupling a client website to the CMS core.

Installed pack manifests live in:

```txt
src/packs/
  core/
  car-rental/
  travel-agency/
  registry.ts
```

Every registered block type belongs to one pack. A website chooses which packs its everyday editors see:

```json
{
  "enabledPacks": ["core", "travel-agency"],
  "editorMode": "client"
}
```

- `client` mode shows only components from the enabled packs.
- `builder` mode shows every installed component; choosing a component also enables its pack for the site.
- Disabling a pack only removes it from the client section picker. Existing content keeps rendering.
- Core is always enabled.

### Pack design contract

Packs provide layouts and business-specific content structures; the active website theme provides the visual identity. Every `PackManifest` must use the versioned semantic design contract from `src/packs/types.ts`.

Pack blocks must use the shared semantic roles instead of brand-specific colors:

| Role | CSS token | Use |
| --- | --- | --- |
| Page | `--site-background` | Main section background |
| Surface | `--site-surface` | Cards and forms |
| Soft surface | `--site-surface-soft` | Alternating sections and subtle emphasis |
| Text | `--site-text` / `--site-muted` | Primary and supporting copy |
| Border | `--site-border` | Dividers, fields, and card outlines |
| Primary | `--site-primary` / `--site-on-primary` | Main action and brand emphasis |
| Accent | `--site-accent` / `--site-on-accent` | Secondary emphasis and badges |
| Inverse | `--site-inverse` / `--site-on-inverse` | Dark or high-emphasis sections |
| Shape | `--site-radius-sm` / `--site-radius` / `--site-radius-lg` | Controls, cards, and large panels |
| Type | `--font-heading` / `--font-body` | Headings and body content |

Do not hard-code a pack palette or force a pack-specific font. If a client needs a recognizable visual direction, add a theme preset and let every enabled pack inherit it. Preview and live rendering both use `src/themes/semanticTokens.ts`, so the same contract applies in the editor, navigation workspace, section library, and published website.

The Travel Agency implementations live inside `src/packs/travel-agency/blocks/`; the core block registry discovers pack-owned definitions, previews, and public renderers automatically. Their editor labels and defaults are generic English content.

The current `VIET_*` identifiers remain only as legacy storage IDs so existing client JSON continues to render. They are not exposed as client branding. A later content migration can introduce canonical `TRAVEL_*` IDs without tying the reusable pack to one installation.

Component packs are for page-building capabilities. They are separate from app packs, which own dynamic business workflows and data.

## Future Improvement: App Packs

Business workflows should be optional app packs, not part of the CMS core.

The CMS core should stay focused on:

- pages
- blocks
- media
- SEO
- navigation
- themes
- publishing

An app pack should own its own database tables, admin screens, smart blocks, public routes, APIs, and browser state. For example, a rental app pack would own:

- cars
- locations
- addons
- availability
- customers
- bookings
- payments later
- `CarSearch`, `CarGrid`, `BookingForm`, and `AvailabilityCalendar` smart blocks
- `/booking/*` public flow routes

Target shape:

```txt
src/apps/
  registry.ts
  types.ts
  rental/
    manifest.ts
    database.sql
    seed.ts
    admin/
    blocks/
    api/
    public/
    lib/
```

The long-term user flow should be:

```txt
Install Rental App
-> create database tables
-> seed starter data
-> register rental smart blocks
-> add rental admin screens
-> enable booking flow routes
-> user manages data in the CMS
```

This keeps a normal website from feeling like a rental system, while still allowing a rental website to be generated from a complete reusable business module.

## Content Storage

GitHub mode needs:

- `CMS_GITHUB_TOKEN`
- `CMS_GITHUB_REPO=owner/repo`
- `CMS_GITHUB_BRANCH=main`

Optional:

- `CMS_GITHUB_CONTENT_ROOT=content`
- `CMS_GITHUB_COMMIT_AUTHOR_NAME`
- `CMS_GITHUB_COMMIT_AUTHOR_EMAIL`

## View Analytics

The public Next.js website includes a lightweight first-party analytics tracker:

- Public pages send one page-view event per browser session path to `POST /api/views`.
- Public links, buttons, and elements with `data-track` send click events to the same endpoint.
- Authenticated CMS users can fetch totals from `GET /api/cms/views` and review them in the CMS Analytics tab.
- When `CMS_ANALYTICS_DATABASE_URL`, `CMS_DATABASE_URL`, or `DATABASE_URL` is configured, events are stored in the `cms_analytics_events` Postgres table. Page views are also mirrored to the legacy `cms_page_views` table for compatibility.
- Without a database, local development stores counters and recent events in `content/analytics/views.json`.

The summary response contains traffic totals, sessions, visitors, bounce rate, time-series points, top paths, top clicks, and top referrers.
