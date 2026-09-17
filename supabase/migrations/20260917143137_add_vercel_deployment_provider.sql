alter table public.cms_site_deployments
  alter column provider set default 'vercel';

alter table public.cms_site_deployments
  drop constraint if exists cms_site_deployments_provider_check;

alter table public.cms_site_deployments
  add constraint cms_site_deployments_provider_check
  check (provider in ('vercel', 'netlify'));
