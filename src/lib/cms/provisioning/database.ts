import postgres from "postgres";
import type { ContentGraph } from "../../../../types";
import type { CmsWorkspaceScope } from "../workspaceTypes";
import { triggerProviderDeployment } from "./deployment";
import { ClientProvisioningError, type DeploymentProvider, type NormalizedClientProvisioningInput, type ProvisioningDeployment } from "./types";

type ProvisioningEnv = Record<string, string | undefined>;

const createProvisioningSql = (env: ProvisioningEnv = process.env) => {
  const databaseUrl = env.CMS_DATABASE_URL || env.DATABASE_URL || "";
  if (!databaseUrl) throw new ClientProvisioningError("Client provisioning requires CMS_DATABASE_URL.", 502);
  const hostname = new URL(databaseUrl).hostname;
  const configuredSsl = String(env.CMS_DATABASE_SSL || "").toLowerCase();
  const ssl = ["localhost", "127.0.0.1", "::1"].includes(hostname)
    ? false
    : configuredSsl === "false" || configuredSsl === "off"
      ? false
      : "require";

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl,
  });
};

export const assertTenantAvailable = async (
  tenantId: string,
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  try {
    const rows = await sql`select 1 from cms_tenants where id = ${tenantId} limit 1`;
    if (rows.length > 0) {
      throw new ClientProvisioningError(
        `A client with the ID "${tenantId}" already exists. Choose a more specific company name.`,
        409,
      );
    }
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const insertProvisionedTenant = async (
  input: NormalizedClientProvisioningInput,
  graph: ContentGraph,
  ownerUserId: string,
  developerUserId?: string,
  provider: DeploymentProvider = "vercel",
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  const graphJson = graph as unknown as postgres.JSONValue;
  try {
    await sql.begin(async (transaction) => {
      await transaction`
        insert into cms_tenants (id, name, created_at, updated_at)
        values (${input.tenantId}, ${input.companyName}, now(), now())
      `;
      await transaction`
        insert into cms_sites (tenant_id, id, name, development_mode, created_at, updated_at)
        values (${input.tenantId}, ${input.siteId}, ${input.companyName}, ${input.developmentMode}, now(), now())
      `;
      await transaction`
        insert into cms_tenant_members (tenant_id, user_id, email, role, created_at, updated_at)
        values (${input.tenantId}, ${ownerUserId}::uuid, ${input.ownerEmail}, 'owner', now(), now())
      `;
      if (developerUserId && input.developerEmail) {
        await transaction`
          insert into cms_tenant_members (tenant_id, user_id, email, role, created_at, updated_at)
          values (${input.tenantId}, ${developerUserId}::uuid, ${input.developerEmail}, 'developer', now(), now())
        `;
      }
      await transaction`
        insert into cms_content_snapshots (tenant_id, site_id, status, version, graph_json, created_at, updated_at)
        values
          (${input.tenantId}, ${input.siteId}, 'draft', 1, ${transaction.json(graphJson)}, now(), now()),
          (${input.tenantId}, ${input.siteId}, 'published', 1, ${transaction.json(graphJson)}, now(), now())
      `;
      await transaction`
        insert into cms_content_versions (tenant_id, site_id, status, version, graph_json, message, created_at)
        values
          (${input.tenantId}, ${input.siteId}, 'draft', 1, ${transaction.json(graphJson)}, 'Provision client website', now()),
          (${input.tenantId}, ${input.siteId}, 'published', 1, ${transaction.json(graphJson)}, 'Provision client website', now())
      `;
      await transaction`
        insert into cms_site_deployments (
          tenant_id, site_id, provider, status, source_repository, source_branch, created_at, updated_at
        ) values (
          ${input.tenantId}, ${input.siteId}, ${provider}, 'provisioning',
          ${input.repository || (provider === 'vercel' ? env.VERCEL_GIT_REPOSITORY : env.NETLIFY_GIT_REPOSITORY) || ''},
          ${input.repositoryBranch || (provider === 'vercel' ? env.VERCEL_GIT_BRANCH : env.NETLIFY_GIT_BRANCH) || 'main'}, now(), now()
        )
      `;
    });
  } catch (error) {
    if (error instanceof ClientProvisioningError) throw error;
    const message = error instanceof Error ? error.message : "Database transaction failed.";
    throw new ClientProvisioningError(`Unable to create the client workspace: ${message}`, 502);
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const updateSiteDeployment = async (
  scope: CmsWorkspaceScope,
  deployment: ProvisioningDeployment,
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  try {
    await sql`
      update cms_site_deployments
      set provider_project_id = ${deployment.projectId},
          provider_project_name = ${deployment.projectName},
          production_url = ${deployment.productionUrl},
          admin_url = ${deployment.adminUrl},
          status = ${deployment.status},
          last_deployment_id = ${deployment.deploymentId},
          source_repository = ${deployment.sourceRepository || ''},
          source_branch = ${deployment.sourceBranch || 'main'},
          last_error = '',
          updated_at = now()
      where tenant_id = ${scope.tenantId}
        and site_id = ${scope.siteId}
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const updateSiteDeploymentState = async (
  scope: CmsWorkspaceScope,
  deployment: { status: "deploying" | "ready" | "failed"; productionUrl: string; deploymentId: string },
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  try {
    await sql`
      update cms_site_deployments
      set status = ${deployment.status},
          production_url = case when ${deployment.productionUrl} = '' then production_url else ${deployment.productionUrl} end,
          last_deployment_id = case when ${deployment.deploymentId} = '' then last_deployment_id else ${deployment.deploymentId} end,
          last_error = '',
          updated_at = now()
      where tenant_id = ${scope.tenantId}
        and site_id = ${scope.siteId}
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const updateProvisionedSiteUrl = async (
  scope: CmsWorkspaceScope,
  siteUrl: string,
  env: ProvisioningEnv = process.env,
) => {
  if (!siteUrl) return;
  const sql = createProvisioningSql(env);
  try {
    await sql.begin(async (transaction) => {
      await transaction`
        update cms_content_snapshots
        set graph_json = jsonb_set(
              case
                when jsonb_typeof(graph_json) = 'string' then (graph_json #>> '{}')::jsonb
                else graph_json
              end,
              '{site,siteUrl}',
              to_jsonb(${siteUrl}::text),
              true
            ),
            updated_at = now()
        where tenant_id = ${scope.tenantId}
          and site_id = ${scope.siteId}
      `;
      await transaction`
        update cms_content_versions
        set graph_json = jsonb_set(
              case
                when jsonb_typeof(graph_json) = 'string' then (graph_json #>> '{}')::jsonb
                else graph_json
              end,
              '{site,siteUrl}',
              to_jsonb(${siteUrl}::text),
              true
            )
        where tenant_id = ${scope.tenantId}
          and site_id = ${scope.siteId}
      `;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const markSiteDeploymentFailed = async (
  scope: CmsWorkspaceScope,
  error: unknown,
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  const message = error instanceof Error ? error.message : "Deployment provisioning failed.";
  try {
    await sql`
      update cms_site_deployments
      set status = 'failed', last_error = ${message.slice(0, 2000)}, updated_at = now()
      where tenant_id = ${scope.tenantId}
        and site_id = ${scope.siteId}
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const markSiteDeploymentProvisioning = async (
  scope: CmsWorkspaceScope,
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  try {
    await sql`
      update cms_site_deployments
      set status = 'provisioning', last_error = '', updated_at = now()
      where tenant_id = ${scope.tenantId}
        and site_id = ${scope.siteId}
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const readClientHostingSetup = async (
  scope: CmsWorkspaceScope,
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  try {
    const rows = await sql`
      select tenant.name as tenant_name,
             site.name as site_name,
             site.development_mode,
             deployment.provider,
             coalesce(draft.graph_json, published.graph_json) as graph_json
      from cms_sites site
      join cms_tenants tenant on tenant.id = site.tenant_id
      left join cms_site_deployments deployment
        on deployment.tenant_id = site.tenant_id
       and deployment.site_id = site.id
      left join cms_content_snapshots draft
        on draft.tenant_id = site.tenant_id
       and draft.site_id = site.id
       and draft.status = 'draft'
      left join cms_content_snapshots published
        on published.tenant_id = site.tenant_id
       and published.site_id = site.id
       and published.status = 'published'
      where site.tenant_id = ${scope.tenantId}
        and site.id = ${scope.siteId}
      limit 1
    `;
    if (rows.length === 0) throw new ClientProvisioningError("Website not found.", 400);
    if (rows[0].provider) throw new ClientProvisioningError("Hosting is already configured for this website.", 409);
    return {
      tenantName: String(rows[0].tenant_name),
      siteName: String(rows[0].site_name),
      developmentMode: rows[0].development_mode === "code" ? "code" as const : "managed" as const,
      graphJson: rows[0].graph_json,
    };
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const insertSiteDeploymentProvisioning = async (
  scope: CmsWorkspaceScope,
  input: Pick<NormalizedClientProvisioningInput, "developmentMode" | "repository" | "repositoryBranch">,
  provider: DeploymentProvider,
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  try {
    const rows = await sql`
      insert into cms_site_deployments (
        tenant_id, site_id, provider, status, source_repository, source_branch, created_at, updated_at
      ) values (
        ${scope.tenantId}, ${scope.siteId}, ${provider}, 'provisioning',
        ${input.repository || (provider === 'vercel' ? env.VERCEL_GIT_REPOSITORY : env.NETLIFY_GIT_REPOSITORY) || ''},
        ${input.repositoryBranch || (provider === 'vercel' ? env.VERCEL_GIT_BRANCH : env.NETLIFY_GIT_BRANCH) || 'main'},
        now(), now()
      )
      on conflict (tenant_id, site_id) do nothing
      returning tenant_id
    `;
    if (rows.length === 0) throw new ClientProvisioningError("Hosting is already configured for this website.", 409);
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const readClientDeploymentRetry = async (
  scope: CmsWorkspaceScope,
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  try {
    const rows = await sql`
      select tenant.name as tenant_name,
             site.name as site_name,
             site.development_mode,
             deployment.provider,
             deployment.provider_project_id,
             deployment.source_repository,
             deployment.source_branch,
             coalesce(draft.graph_json, published.graph_json) as graph_json
      from cms_sites site
      join cms_tenants tenant on tenant.id = site.tenant_id
      join cms_site_deployments deployment
        on deployment.tenant_id = site.tenant_id
       and deployment.site_id = site.id
      left join cms_content_snapshots draft
        on draft.tenant_id = site.tenant_id
       and draft.site_id = site.id
       and draft.status = 'draft'
      left join cms_content_snapshots published
        on published.tenant_id = site.tenant_id
       and published.site_id = site.id
       and published.status = 'published'
      where site.tenant_id = ${scope.tenantId}
        and site.id = ${scope.siteId}
      limit 1
    `;
    if (rows.length === 0) {
      throw new ClientProvisioningError("Client deployment record not found.", 400);
    }
    return {
      tenantName: String(rows[0].tenant_name),
      siteName: String(rows[0].site_name),
      developmentMode: rows[0].development_mode === "code" ? "code" as const : "managed" as const,
      provider: String(rows[0].provider) as DeploymentProvider,
      projectId: String(rows[0].provider_project_id || ""),
      repository: String(rows[0].source_repository || ""),
      branch: String(rows[0].source_branch || "main"),
      graphJson: rows[0].graph_json,
    };
  } finally {
    await sql.end({ timeout: 1 });
  }
};

export const triggerWorkspaceDeployment = async (
  scope: CmsWorkspaceScope,
  env: ProvisioningEnv = process.env,
) => {
  const sql = createProvisioningSql(env);
  try {
    const rows = await sql`
      select provider, provider_project_id, source_repository, source_branch
      from cms_site_deployments
      where tenant_id = ${scope.tenantId}
        and site_id = ${scope.siteId}
      limit 1
    `;
    if (rows.length === 0 || !rows[0].provider_project_id) return [];
    const provider = String(rows[0].provider);
    if (provider !== "netlify" && provider !== "vercel") {
      return [`Unsupported deployment provider "${provider}".`];
    }
    if (provider === "netlify" && !(env.NETLIFY_ACCESS_TOKEN || env.NETLIFY_AUTH_TOKEN)) return [];
    if (provider === "vercel" && !(env.VERCEL_ACCESS_TOKEN || env.VERCEL_TOKEN)) return [];

    try {
      const build = await triggerProviderDeployment(
        provider,
        String(rows[0].provider_project_id),
        String(rows[0].source_repository || ""),
        String(rows[0].source_branch || "main"),
        `BlockForge publish for ${scope.tenantId}/${scope.siteId}`,
        env,
      );
      await sql`
        update cms_site_deployments
        set status = ${build.state},
            last_deployment_id = ${build.id},
            last_error = '',
            updated_at = now()
        where tenant_id = ${scope.tenantId}
          and site_id = ${scope.siteId}
      `;
      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Deployment request failed.";
      await sql`
        update cms_site_deployments
        set status = 'failed', last_error = ${message.slice(0, 2000)}, updated_at = now()
        where tenant_id = ${scope.tenantId}
          and site_id = ${scope.siteId}
      `;
      return [`Content was published, but the site deployment failed: ${message}`];
    }
  } finally {
    await sql.end({ timeout: 1 });
  }
};
