create table if not exists public.cms_platform_admins (
  user_id uuid primary key,
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cms_platform_admins_email_idx
  on public.cms_platform_admins (lower(email))
  where email <> '';

create table if not exists public.cms_tenant_members (
  tenant_id text not null references public.cms_tenants(id) on delete cascade,
  user_id uuid not null,
  email text not null default '',
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists cms_tenant_members_user_idx
  on public.cms_tenant_members (user_id, tenant_id);

create index if not exists cms_tenant_members_tenant_role_idx
  on public.cms_tenant_members (tenant_id, role);

-- The current BlockForge content database is plain PostgreSQL while Auth is
-- hosted in Supabase. Keep user IDs portable now, and add Auth foreign keys
-- automatically when this migration runs in a Supabase Postgres database.
do $migration$
begin
  if to_regclass('auth.users') is not null then
    if not exists (
      select 1 from pg_constraint where conname = 'cms_platform_admins_user_id_fkey'
    ) then
      alter table public.cms_platform_admins
        add constraint cms_platform_admins_user_id_fkey
        foreign key (user_id) references auth.users(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint where conname = 'cms_tenant_members_user_id_fkey'
    ) then
      alter table public.cms_tenant_members
        add constraint cms_tenant_members_user_id_fkey
        foreign key (user_id) references auth.users(id) on delete cascade;
    end if;
  end if;
end
$migration$;

-- Install Data API policies only when this is running inside Supabase. The
-- application also performs the same role check before every CMS API action.
do $migration$
begin
  if to_regprocedure('auth.uid()') is null then
    return;
  end if;

  execute $function$
    create or replace function public.cms_is_platform_admin()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public, pg_temp
    as $$
      select exists (
        select 1 from public.cms_platform_admins where user_id = (select auth.uid())
      )
    $$
  $function$;

  execute $function$
    create or replace function public.cms_has_tenant_role(target_tenant_id text, allowed_roles text[])
    returns boolean
    language sql
    stable
    security definer
    set search_path = public, pg_temp
    as $$
      select public.cms_is_platform_admin() or exists (
        select 1
        from public.cms_tenant_members
        where tenant_id = target_tenant_id
          and user_id = (select auth.uid())
          and role = any(allowed_roles)
      )
    $$
  $function$;

  execute 'revoke all on function public.cms_is_platform_admin() from public';
  execute 'revoke all on function public.cms_has_tenant_role(text, text[]) from public';
  execute 'grant execute on function public.cms_is_platform_admin() to authenticated';
  execute 'grant execute on function public.cms_has_tenant_role(text, text[]) to authenticated';

  alter table public.cms_platform_admins enable row level security;
  alter table public.cms_tenant_members enable row level security;
  alter table public.cms_tenants enable row level security;
  alter table public.cms_sites enable row level security;
  alter table public.cms_content_snapshots enable row level security;
  alter table public.cms_content_versions enable row level security;
  alter table public.cms_analytics_events enable row level security;
  alter table public.cms_page_views enable row level security;

  drop policy if exists cms_platform_admins_select on public.cms_platform_admins;
  create policy cms_platform_admins_select on public.cms_platform_admins
    for select to authenticated
    using (user_id = (select auth.uid()) or public.cms_is_platform_admin());

  drop policy if exists cms_platform_admins_manage on public.cms_platform_admins;
  create policy cms_platform_admins_manage on public.cms_platform_admins
    for all to authenticated
    using (public.cms_is_platform_admin())
    with check (public.cms_is_platform_admin());

  drop policy if exists cms_tenant_members_select on public.cms_tenant_members;
  create policy cms_tenant_members_select on public.cms_tenant_members
    for select to authenticated
    using (user_id = (select auth.uid()) or public.cms_is_platform_admin());

  drop policy if exists cms_tenant_members_manage on public.cms_tenant_members;
  create policy cms_tenant_members_manage on public.cms_tenant_members
    for all to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'admin']))
    with check (public.cms_has_tenant_role(tenant_id, array['owner', 'admin']));

  drop policy if exists cms_tenants_select on public.cms_tenants;
  create policy cms_tenants_select on public.cms_tenants
    for select to authenticated
    using (public.cms_has_tenant_role(id, array['owner', 'admin', 'editor', 'viewer']));

  drop policy if exists cms_tenants_manage on public.cms_tenants;
  create policy cms_tenants_manage on public.cms_tenants
    for all to authenticated
    using (public.cms_is_platform_admin())
    with check (public.cms_is_platform_admin());

  drop policy if exists cms_sites_select on public.cms_sites;
  create policy cms_sites_select on public.cms_sites
    for select to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'admin', 'editor', 'viewer']));

  drop policy if exists cms_sites_manage on public.cms_sites;
  create policy cms_sites_manage on public.cms_sites
    for all to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'admin']))
    with check (public.cms_has_tenant_role(tenant_id, array['owner', 'admin']));

  drop policy if exists cms_content_snapshots_select on public.cms_content_snapshots;
  create policy cms_content_snapshots_select on public.cms_content_snapshots
    for select to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'admin', 'editor', 'viewer']));

  drop policy if exists cms_content_snapshots_write on public.cms_content_snapshots;
  create policy cms_content_snapshots_write on public.cms_content_snapshots
    for all to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'admin', 'editor']))
    with check (public.cms_has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));

  drop policy if exists cms_content_versions_select on public.cms_content_versions;
  create policy cms_content_versions_select on public.cms_content_versions
    for select to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'admin', 'editor', 'viewer']));

  drop policy if exists cms_content_versions_write on public.cms_content_versions;
  create policy cms_content_versions_write on public.cms_content_versions
    for insert to authenticated
    with check (public.cms_has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));

  drop policy if exists cms_analytics_events_select on public.cms_analytics_events;
  create policy cms_analytics_events_select on public.cms_analytics_events
    for select to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'admin', 'editor', 'viewer']));

  drop policy if exists cms_page_views_select on public.cms_page_views;
  create policy cms_page_views_select on public.cms_page_views
    for select to authenticated
    using (public.cms_has_tenant_role(tenant_id, array['owner', 'admin', 'editor', 'viewer']));

  grant select on public.cms_platform_admins, public.cms_tenant_members,
    public.cms_tenants, public.cms_sites, public.cms_content_snapshots,
    public.cms_content_versions, public.cms_analytics_events, public.cms_page_views
    to authenticated;
  grant insert, update, delete on public.cms_tenant_members, public.cms_tenants,
    public.cms_sites, public.cms_content_snapshots to authenticated;
  grant insert on public.cms_content_versions to authenticated;
end
$migration$;
