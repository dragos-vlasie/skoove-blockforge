create table if not exists public.cms_site_deployments (
  tenant_id text not null,
  site_id text not null,
  provider text not null default 'netlify' check (provider in ('netlify')),
  provider_project_id text not null default '',
  provider_project_name text not null default '',
  production_url text not null default '',
  admin_url text not null default '',
  status text not null default 'provisioning'
    check (status in ('provisioning', 'deploying', 'ready', 'failed')),
  last_deployment_id text not null default '',
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, site_id),
  foreign key (tenant_id, site_id)
    references public.cms_sites(tenant_id, id) on delete cascade
);

create index if not exists cms_site_deployments_status_idx
  on public.cms_site_deployments (status, updated_at desc);

do $migration$
begin
  if to_regprocedure('auth.uid()') is null then
    return;
  end if;

  alter table public.cms_site_deployments enable row level security;

  drop policy if exists cms_site_deployments_select on public.cms_site_deployments;
  create policy cms_site_deployments_select on public.cms_site_deployments
    for select to authenticated
    using (
      public.cms_has_tenant_role(
        tenant_id,
        array['owner', 'admin', 'editor', 'viewer']
      )
    );

  drop policy if exists cms_site_deployments_manage on public.cms_site_deployments;
  create policy cms_site_deployments_manage on public.cms_site_deployments
    for all to authenticated
    using (public.cms_is_platform_admin())
    with check (public.cms_is_platform_admin());

  grant select, insert, update, delete
    on public.cms_site_deployments to authenticated;
end
$migration$;
