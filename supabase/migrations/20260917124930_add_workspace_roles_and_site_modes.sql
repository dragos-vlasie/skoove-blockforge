alter table public.cms_tenant_members
  drop constraint if exists cms_tenant_members_role_check;

alter table public.cms_tenant_members
  add constraint cms_tenant_members_role_check
  check (role in ('owner', 'manager', 'developer', 'admin', 'editor', 'viewer'));

alter table public.cms_sites
  add column if not exists development_mode text not null default 'managed'
  check (development_mode in ('managed', 'code'));

alter table public.cms_site_deployments
  add column if not exists source_repository text not null default '',
  add column if not exists source_branch text not null default 'main';

do $migration$
begin
  if to_regprocedure('auth.uid()') is null then
    return;
  end if;

  drop policy if exists cms_tenant_members_select on public.cms_tenant_members;
  create policy cms_tenant_members_select on public.cms_tenant_members
    for select to authenticated
    using (
      user_id = (select auth.uid())
      or public.cms_has_tenant_role(tenant_id, array['owner', 'manager', 'admin'])
    );

  drop policy if exists cms_tenant_members_manage on public.cms_tenant_members;
  create policy cms_tenant_members_manage on public.cms_tenant_members
    for all to authenticated
    using (
      public.cms_has_tenant_role(tenant_id, array['owner'])
      or (
        role <> 'owner'
        and public.cms_has_tenant_role(tenant_id, array['manager', 'admin'])
      )
    )
    with check (
      public.cms_has_tenant_role(tenant_id, array['owner'])
      or (
        role <> 'owner'
        and public.cms_has_tenant_role(tenant_id, array['manager', 'admin'])
      )
    );

  drop policy if exists cms_tenants_select on public.cms_tenants;
  create policy cms_tenants_select on public.cms_tenants
    for select to authenticated
    using (
      public.cms_has_tenant_role(
        id,
        array['owner', 'manager', 'developer', 'admin', 'editor', 'viewer']
      )
    );

  drop policy if exists cms_sites_select on public.cms_sites;
  create policy cms_sites_select on public.cms_sites
    for select to authenticated
    using (
      public.cms_has_tenant_role(
        tenant_id,
        array['owner', 'manager', 'developer', 'admin', 'editor', 'viewer']
      )
    );

  drop policy if exists cms_sites_manage on public.cms_sites;
  create policy cms_sites_manage on public.cms_sites
    for all to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'manager', 'developer', 'admin']))
    with check (public.cms_has_tenant_role(tenant_id, array['owner', 'manager', 'developer', 'admin']));

  drop policy if exists cms_content_snapshots_select on public.cms_content_snapshots;
  create policy cms_content_snapshots_select on public.cms_content_snapshots
    for select to authenticated
    using (
      public.cms_has_tenant_role(
        tenant_id,
        array['owner', 'manager', 'developer', 'admin', 'editor', 'viewer']
      )
    );

  drop policy if exists cms_content_snapshots_write on public.cms_content_snapshots;
  create policy cms_content_snapshots_write on public.cms_content_snapshots
    for all to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'manager', 'developer', 'admin', 'editor']))
    with check (public.cms_has_tenant_role(tenant_id, array['owner', 'manager', 'developer', 'admin', 'editor']));

  drop policy if exists cms_content_versions_select on public.cms_content_versions;
  create policy cms_content_versions_select on public.cms_content_versions
    for select to authenticated
    using (
      public.cms_has_tenant_role(
        tenant_id,
        array['owner', 'manager', 'developer', 'admin', 'editor', 'viewer']
      )
    );

  drop policy if exists cms_content_versions_write on public.cms_content_versions;
  create policy cms_content_versions_write on public.cms_content_versions
    for insert to authenticated
    with check (public.cms_has_tenant_role(tenant_id, array['owner', 'manager', 'developer', 'admin', 'editor']));

  drop policy if exists cms_analytics_events_select on public.cms_analytics_events;
  create policy cms_analytics_events_select on public.cms_analytics_events
    for select to authenticated
    using (
      public.cms_has_tenant_role(
        tenant_id,
        array['owner', 'manager', 'developer', 'admin', 'editor', 'viewer']
      )
    );

  drop policy if exists cms_page_views_select on public.cms_page_views;
  create policy cms_page_views_select on public.cms_page_views
    for select to authenticated
    using (
      public.cms_has_tenant_role(
        tenant_id,
        array['owner', 'manager', 'developer', 'admin', 'editor', 'viewer']
      )
    );

  drop policy if exists cms_site_deployments_select on public.cms_site_deployments;
  create policy cms_site_deployments_select on public.cms_site_deployments
    for select to authenticated
    using (
      public.cms_has_tenant_role(
        tenant_id,
        array['owner', 'manager', 'developer', 'admin', 'editor', 'viewer']
      )
    );

  drop policy if exists cms_site_deployments_manage on public.cms_site_deployments;
  create policy cms_site_deployments_manage on public.cms_site_deployments
    for all to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'manager', 'developer', 'admin']))
    with check (public.cms_has_tenant_role(tenant_id, array['owner', 'manager', 'developer', 'admin']));
end
$migration$;
