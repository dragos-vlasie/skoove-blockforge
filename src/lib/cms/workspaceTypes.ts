export type CmsTenantRole = "owner" | "manager" | "developer" | "admin" | "editor" | "viewer";

export type CmsWorkspaceRole = "platform_admin" | CmsTenantRole;

export type CmsDevelopmentMode = "managed" | "code";

export type CmsDeploymentStatus = "not_configured" | "provisioning" | "deploying" | "ready" | "failed";

export type CmsWorkspaceScope = {
  tenantId: string;
  siteId: string;
};

export type CmsWorkspace = CmsWorkspaceScope & {
  tenantName: string;
  siteName: string;
  siteUrl: string;
  role: CmsWorkspaceRole;
  developmentMode: CmsDevelopmentMode;
  deploymentProvider: string;
  deploymentProjectId: string;
  deploymentId: string;
  deploymentStatus: CmsDeploymentStatus;
  deploymentUrl: string;
  deploymentUpdatedAt: string;
  deploymentError: string;
  sourceRepository: string;
  sourceBranch: string;
  publishedAt: string;
  draftVersion: number;
  publishedVersion: number;
  pageCount: number;
  entryCount: number;
  assetCount: number;
  updatedAt: string;
};

export const cmsWorkspaceHref = (workspace: CmsWorkspaceScope) =>
  `/cms/${encodeURIComponent(workspace.tenantId)}?site=${encodeURIComponent(workspace.siteId)}`;

export const cmsApiUrl = (
  path: string,
  workspace: CmsWorkspaceScope,
  params: Record<string, string | number | undefined> = {},
) => {
  const search = new URLSearchParams({
    tenant: workspace.tenantId,
    site: workspace.siteId,
  });

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });

  const normalizedPath = path.endsWith("/") ? path : `${path}/`;
  return `${normalizedPath}?${search.toString()}`;
};
