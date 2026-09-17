import type { CmsWorkspace } from "../workspaceTypes";
import { updateProvisionedSiteUrl, updateSiteDeploymentState } from "./database";
import { readProviderDeploymentStatus } from "./deployment";

type ProvisioningEnv = Record<string, string | undefined>;

const hasCustomDomain = (siteUrl: string) => {
  try {
    const hostname = new URL(siteUrl).hostname;
    return hostname.includes(".") && !hostname.endsWith(".vercel.app") && !/^\d+(?:\.\d+){3}$/.test(hostname);
  } catch {
    return false;
  }
};

export const reconcileWorkspaceDeployments = async (
  workspaces: CmsWorkspace[],
  env: ProvisioningEnv = process.env,
) => Promise.all(workspaces.map(async (workspace) => {
  if (
    workspace.deploymentProvider !== "vercel"
    || !workspace.deploymentProjectId
    || !["provisioning", "deploying"].includes(workspace.deploymentStatus)
  ) return workspace;

  try {
    const remote = await readProviderDeploymentStatus("vercel", workspace.deploymentProjectId, env);
    if (!remote) return workspace;

    const productionUrl = hasCustomDomain(workspace.siteUrl)
      ? workspace.siteUrl
      : remote.productionUrl || workspace.deploymentUrl;

    await updateSiteDeploymentState(workspace, { ...remote, productionUrl }, env);
    if (productionUrl && productionUrl !== workspace.siteUrl) {
      await updateProvisionedSiteUrl(workspace, productionUrl, env);
    }

    return {
      ...workspace,
      siteUrl: productionUrl || workspace.siteUrl,
      deploymentStatus: remote.status,
      deploymentUrl: productionUrl,
      deploymentId: remote.deploymentId || workspace.deploymentId,
      deploymentError: "",
      deploymentUpdatedAt: new Date().toISOString(),
    };
  } catch {
    return workspace;
  }
}));
