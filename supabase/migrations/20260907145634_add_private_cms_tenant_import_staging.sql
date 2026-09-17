create table if not exists cms.cms_tenant_import_chunks (
  import_id uuid not null,
  tenant_id text not null,
  site_id text not null,
  table_name text not null check (table_name in (
    'cms_tenants',
    'cms_sites',
    'cms_content_snapshots',
    'cms_content_versions',
    'cms_site_states',
    'cms_content_items',
    'cms_content_item_versions'
  )),
  row_number integer not null check (row_number >= 0),
  chunk_number integer not null check (chunk_number >= 0),
  chunk_count integer not null check (chunk_count > 0),
  payload_base64 text not null,
  created_at timestamptz not null default now(),
  primary key (import_id, table_name, row_number, chunk_number)
);
create index if not exists cms_tenant_import_chunks_scope_idx
  on cms.cms_tenant_import_chunks (tenant_id, site_id, import_id);
alter table cms.cms_tenant_import_chunks enable row level security;
revoke all on cms.cms_tenant_import_chunks from public, anon, authenticated;
