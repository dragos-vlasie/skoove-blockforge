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
  development_mode text not null default 'managed'
    check (development_mode in ('managed', 'code')),
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

create table if not exists cms_site_deployments (
  tenant_id text not null,
  site_id text not null,
  provider text not null default 'vercel' check (provider in ('vercel', 'netlify')),
  provider_project_id text not null default '',
  provider_project_name text not null default '',
  production_url text not null default '',
  admin_url text not null default '',
  status text not null default 'provisioning'
    check (status in ('provisioning', 'deploying', 'ready', 'failed')),
  last_deployment_id text not null default '',
  last_error text not null default '',
  source_repository text not null default '',
  source_branch text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, site_id),
  foreign key (tenant_id, site_id) references cms_sites(tenant_id, id) on delete cascade
);

create index if not exists cms_site_deployments_status_idx
  on cms_site_deployments (status, updated_at desc);
