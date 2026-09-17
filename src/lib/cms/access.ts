import postgres from "postgres";
import { cookies, headers } from "next/headers";
import {
  CMS_SESSION_COOKIE,
  isLocalCmsRequest,
  verifySessionToken,
} from "./auth";
import { getSupabaseCmsUser } from "./supabaseAuth";
import type {
  CmsTenantRole,
  CmsWorkspace,
  CmsWorkspaceRole,
} from "./workspaceTypes";

export type CmsActor =
  | { kind: "platform"; id: "local-platform-admin"; email: string }
  | { kind: "supabase"; id: string; email: string };

export class CmsAccessError extends Error {
  constructor(message: string, readonly status: 400 | 401 | 403 | 404 = 403) {
    super(message);
  }
}

const roleRank: Record<CmsWorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  developer: 3,
  admin: 4,
  manager: 4,
  owner: 5,
  platform_admin: 6,
};

const databaseUrl = () => process.env.CMS_DATABASE_URL || process.env.DATABASE_URL || "";

const createSql = () => {
  const url = databaseUrl();
  if (!url) throw new Error("CMS_DATABASE_URL or DATABASE_URL is required for multi-client access.");
  const hostname = new URL(url).hostname;
  const configuredSsl = String(process.env.CMS_DATABASE_SSL || "").toLowerCase();
  const ssl = ["localhost", "127.0.0.1", "::1"].includes(hostname)
    ? false
    : configuredSsl === "false" || configuredSsl === "off"
      ? false
      : "require";

  return postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl,
  });
};

const requestUrlFromHeaders = async () => {
  const headerStore = await headers();
  const host = headerStore.get("host") || "localhost";
  const protocol = headerStore.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}/cms`;
};

export const getCmsActor = async (requestUrl?: string | URL): Promise<CmsActor | null> => {
  const url = requestUrl || await requestUrlFromHeaders();
  if (isLocalCmsRequest(url)) {
    return { kind: "platform", id: "local-platform-admin", email: "local@blockforge.dev" };
  }

  const cookieStore = await cookies();
  if (verifySessionToken(cookieStore.get(CMS_SESSION_COOKIE)?.value)) {
    return { kind: "platform", id: "local-platform-admin", email: "platform-admin" };
  }

  const user = await getSupabaseCmsUser();
  if (!user) return null;
  return {
    kind: "supabase",
    id: user.id,
    email: user.email || "",
  };
};

const configuredPlatformAdminEmails = () =>
  new Set(
    String(process.env.CMS_PLATFORM_ADMIN_EMAILS || process.env.CMS_PLATFORM_ADMIN_EMAIL || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

const isCmsPlatformAdminWithSql = async (
  actor: CmsActor,
  sql: postgres.Sql,
) => {
  if (actor.kind === "platform") return true;
  if (configuredPlatformAdminEmails().has(actor.email.toLowerCase())) return true;

  const rows = await sql`
    select 1
    from cms_platform_admins
    where user_id = ${actor.id}::uuid
      or (${actor.email} <> '' and lower(email) = lower(${actor.email}))
    limit 1
  `;
  return rows.length > 0;
};

export const isCmsPlatformAdmin = async (actor: CmsActor) => {
  const sql = createSql();
  try {
    return await isCmsPlatformAdminWithSql(actor, sql);
  } finally {
    await sql.end({ timeout: 1 });
  }
};

const graphSiteUrl = (value: unknown) => {
  let graph: unknown = value;
  try {
    graph = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return "";
  }
  if (!graph || typeof graph !== "object") return "";
  const site = (graph as { site?: { siteUrl?: unknown } }).site;
  return typeof site?.siteUrl === "string" ? site.siteUrl : "";
};

const graphCollectionSize = (value: unknown, key: "pages" | "entries" | "assets") => {
  let graph: unknown = value;
  try {
    graph = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return 0;
  }
  if (!graph || typeof graph !== "object") return 0;
  const collection = (graph as Record<string, unknown>)[key];
  return Array.isArray(collection) ? collection.length : 0;
};

const isoDate = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export const listCmsWorkspaces = async (actor: CmsActor): Promise<CmsWorkspace[]> => {
  const sql = createSql();
  try {
    const platformAdmin = await isCmsPlatformAdminWithSql(actor, sql);

    const userId = actor.kind === "supabase" ? actor.id : null;
    const rows = await sql`
      select
        tenant.id as tenant_id,
        tenant.name as tenant_name,
        site.id as site_id,
        site.name as site_name,
        site.development_mode,
        site.updated_at,
        coalesce(draft.graph_json, published.graph_json) as graph_json,
        draft.version as draft_version,
        published.version as published_version,
        published.updated_at as published_at,
        deployment.provider as deployment_provider,
        deployment.provider_project_id,
        deployment.last_deployment_id,
        deployment.status as deployment_status,
        deployment.production_url as deployment_url,
        deployment.updated_at as deployment_updated_at,
        deployment.last_error as deployment_error,
        deployment.source_repository,
        deployment.source_branch,
        member.role
      from cms_sites site
      join cms_tenants tenant on tenant.id = site.tenant_id
      left join cms_tenant_members member
        on member.tenant_id = tenant.id
       and member.user_id = ${userId}::uuid
      left join cms_content_snapshots draft
        on draft.tenant_id = site.tenant_id
       and draft.site_id = site.id
       and draft.status = 'draft'
      left join cms_content_snapshots published
        on published.tenant_id = site.tenant_id
       and published.site_id = site.id
       and published.status = 'published'
      left join cms_site_deployments deployment
        on deployment.tenant_id = site.tenant_id
       and deployment.site_id = site.id
      where ${platformAdmin} or member.user_id is not null
      order by tenant.name, site.name
    `;

    return rows.map((row) => ({
      tenantId: String(row.tenant_id),
      tenantName: String(row.tenant_name),
      siteId: String(row.site_id),
      siteName: String(row.site_name),
      siteUrl: graphSiteUrl(row.graph_json),
      role: platformAdmin ? "platform_admin" : row.role as CmsTenantRole,
      developmentMode: row.development_mode === "code" ? "code" : "managed",
      deploymentProvider: String(row.deployment_provider || ""),
      deploymentProjectId: String(row.provider_project_id || ""),
      deploymentId: String(row.last_deployment_id || ""),
      deploymentStatus: row.deployment_status
        ? String(row.deployment_status) as CmsWorkspace["deploymentStatus"]
        : "not_configured",
      deploymentUrl: String(row.deployment_url || ""),
      deploymentUpdatedAt: isoDate(row.deployment_updated_at),
      deploymentError: String(row.deployment_error || ""),
      sourceRepository: String(row.source_repository || ""),
      sourceBranch: String(row.source_branch || "main"),
      publishedAt: isoDate(row.published_at),
      draftVersion: Number(row.draft_version || 0),
      publishedVersion: Number(row.published_version || 0),
      pageCount: graphCollectionSize(row.graph_json, "pages"),
      entryCount: graphCollectionSize(row.graph_json, "entries"),
      assetCount: graphCollectionSize(row.graph_json, "assets"),
      updatedAt: isoDate(row.updated_at),
    }));
  } finally {
    await sql.end({ timeout: 1 });
  }
};

const readScope = (request: Request) => {
  const url = new URL(request.url);
  return {
    tenantId: url.searchParams.get("tenant") || process.env.CMS_TENANT_ID || "",
    siteId: url.searchParams.get("site") || process.env.CMS_SITE_ID || "",
  };
};

const incomingRequestUrl = (request: Request) => {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host) url.host = host;
  if (forwardedProtocol === "http" || forwardedProtocol === "https") url.protocol = `${forwardedProtocol}:`;
  return url;
};

export const authorizeCmsWorkspace = async (
  request: Request,
  minimumRole: CmsTenantRole = "viewer",
) => {
  const actor = await getCmsActor(incomingRequestUrl(request));
  if (!actor) throw new CmsAccessError("Sign in to continue.", 401);

  const scope = readScope(request);
  if (!scope.tenantId || !scope.siteId) {
    throw new CmsAccessError("Choose a client workspace first.", 400);
  }

  const workspaces = await listCmsWorkspaces(actor);
  const workspace = workspaces.find(
    (candidate) => candidate.tenantId === scope.tenantId && candidate.siteId === scope.siteId,
  );
  if (!workspace) throw new CmsAccessError("Client workspace not found or not accessible.", 404);
  if (roleRank[workspace.role] < roleRank[minimumRole]) {
    throw new CmsAccessError(`The ${workspace.role} role cannot perform this action.`, 403);
  }

  return { actor, workspace };
};

export const authorizeCmsPlatformAdmin = async (request: Request) => {
  const actor = await getCmsActor(incomingRequestUrl(request));
  if (!actor) throw new CmsAccessError("Sign in to continue.", 401);
  if (!(await isCmsPlatformAdmin(actor))) {
    throw new CmsAccessError("Platform administrator access is required.", 403);
  }
  return actor;
};

export const cmsAccessErrorResponse = (
  error: unknown,
  fallback: string,
  fallbackStatus = 500,
) => {
  if (error instanceof CmsAccessError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: fallbackStatus },
  );
};
