create schema if not exists cms;
revoke all on schema cms from public, anon, authenticated;
alter default privileges in schema cms revoke all on tables from public, anon, authenticated;
alter default privileges in schema cms revoke all on sequences from public, anon, authenticated;
set search_path = cms, public;
create table if not exists cms_tenants (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists cms_sites (
  tenant_id text not null references cms_tenants(id) on delete cascade,
  id text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create table if not exists cms_content_snapshots (
  tenant_id text not null,
  site_id text not null,
  status text not null check (status in ('draft', 'published')),
  version integer not null default 1,
  graph_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, site_id, status),
  foreign key (tenant_id, site_id) references cms_sites(tenant_id, id) on delete cascade
);
create table if not exists cms_content_versions (
  id bigserial primary key,
  tenant_id text not null,
  site_id text not null,
  status text not null check (status in ('draft', 'published')),
  version integer not null,
  graph_json jsonb not null,
  message text not null default '',
  created_at timestamptz not null default now(),
  foreign key (tenant_id, site_id) references cms_sites(tenant_id, id) on delete cascade
);
create index if not exists cms_content_versions_site_idx
  on cms_content_versions (tenant_id, site_id, status, created_at desc);
-- The snapshot tables remain as a rollback copy. Normal CMS reads use the
-- granular tables below so a workspace never transfers every content block.
create table if not exists cms_site_states (
  tenant_id text not null,
  site_id text not null,
  snapshot text not null check (snapshot in ('draft', 'published')),
  state_json jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, site_id, snapshot),
  foreign key (tenant_id, site_id) references cms_sites(tenant_id, id) on delete cascade
);
create table if not exists cms_content_items (
  tenant_id text not null,
  site_id text not null,
  snapshot text not null check (snapshot in ('draft', 'published')),
  content_id text not null,
  kind text not null check (kind in ('page', 'collectionEntry')),
  locale text not null,
  route_path text not null,
  title text not null,
  content_status text not null check (content_status in ('draft', 'published', 'archived')),
  collection_id text,
  summary_json jsonb not null,
  document_json jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, site_id, snapshot, content_id),
  foreign key (tenant_id, site_id) references cms_sites(tenant_id, id) on delete cascade
);
create table if not exists cms_content_item_versions (
  id bigserial primary key,
  tenant_id text not null,
  site_id text not null,
  snapshot text not null check (snapshot in ('draft', 'published')),
  content_id text not null,
  version integer not null,
  document_json jsonb not null,
  message text not null default '',
  created_at timestamptz not null default now(),
  foreign key (tenant_id, site_id) references cms_sites(tenant_id, id) on delete cascade
);
create index if not exists cms_content_items_route_idx
  on cms_content_items (tenant_id, site_id, snapshot, route_path)
  where content_status = 'published';
create index if not exists cms_content_items_listing_idx
  on cms_content_items (
    tenant_id, site_id, snapshot, kind, locale, content_status, updated_at desc, content_id desc
  );
create index if not exists cms_content_items_collection_idx
  on cms_content_items (
    tenant_id, site_id, snapshot, collection_id, locale, content_status, updated_at desc, content_id desc
  )
  where collection_id is not null;
create index if not exists cms_content_item_versions_item_idx
  on cms_content_item_versions (tenant_id, site_id, snapshot, content_id, version desc);
alter table cms_tenants enable row level security;
alter table cms_sites enable row level security;
alter table cms_content_snapshots enable row level security;
alter table cms_content_versions enable row level security;
alter table cms_site_states enable row level security;
alter table cms_content_items enable row level security;
alter table cms_content_item_versions enable row level security;
revoke all on cms_tenants, cms_sites, cms_content_snapshots, cms_content_versions,
  cms_site_states, cms_content_items, cms_content_item_versions
from public, anon, authenticated;
revoke all on sequence cms_content_versions_id_seq, cms_content_item_versions_id_seq
from public, anon, authenticated;
