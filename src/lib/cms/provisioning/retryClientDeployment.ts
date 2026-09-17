import { normalizeContentGraph } from "../storage/splitContent";
import {
  markSiteDeploymentFailed,
  markSiteDeploymentProvisioning,
  readClientDeploymentRetry,
  updateProvisionedSiteUrl,
  updateSiteDeployment,
} from "./database";
import { provisionDeploymentSiteForProvider } from "./deployment";
import { normalizeProvisioningDomain } from "./seed";
import { ClientProvisioningError, type NormalizedClientProvisioningInput } from "./types";
import { vercelProjectNameForTenant } from "./vercel";

type ProvisioningEnv = Record<string, string | undefined>;

export type RetryClientDeploymentInput = {
  tenantId: string;
  siteId: string;
  domain?: string;
  deploymentProjectId?: string;
};

export const retryClientDeployment = async (
  rawInput: RetryClientDeploymentInput,
  env: ProvisioningEnv = process.env,
) => {
  const scope = {
    tenantId: String(rawInput.tenantId || "").trim(),
    siteId: String(rawInput.siteId || "").trim(),
  };
  if (!scope.tenantId || !scope.siteId) {
    throw new ClientProvisioningError("Choose a client workspace to retry.");
  }

  const current = await readClientDeploymentRetry(scope, env);
  if (current.provider !== "vercel" && current.provider !== "netlify") {
    throw new ClientProvisioningError(`Unsupported deployment provider "${current.provider}".`, 502);
  }
  const domain = normalizeProvisioningDomain(String(rawInput.domain || ""));
  let storedGraph = current.graphJson;
  try {
    if (typeof storedGraph === "string") storedGraph = JSON.parse(storedGraph);
  } catch {
    throw new ClientProvisioningError("The saved website content could not be read. Repair the content snapshot before retrying.", 502);
  }
  const graph = normalizeContentGraph((storedGraph || {}) as Parameters<typeof normalizeContentGraph>[0]);
  const fallbackProjectId = current.provider === "vercel"
    ? vercelProjectNameForTenant(scope.tenantId, env)
    : "";
  const input: NormalizedClientProvisioningInput = {
    companyName: current.tenantName,
    ownerEmail: "",
    starterId: graph.site.starterId || "blank",
    themeId: "",
    enabledPacks: graph.site.enabledPacks || ["core"],
    clientExtensions: graph.site.clientExtensions || [],
    tenantId: scope.tenantId,
    siteId: scope.siteId,
    developmentMode: current.developmentMode,
    repository: current.repository || undefined,
    repositoryBranch: current.branch,
    deploymentProjectId: String(rawInput.deploymentProjectId || current.projectId || fallbackProjectId).trim() || undefined,
    ...domain,
  };

  await markSiteDeploymentProvisioning(scope, env);
  try {
    const deployment = await provisionDeploymentSiteForProvider(current.provider, input, env);
    await updateSiteDeployment(scope, deployment, env);
    await updateProvisionedSiteUrl(scope, deployment.productionUrl, env);
    const warnings: string[] = [];
    if (deployment.customDomain && deployment.customDomainVerified === false) {
      warnings.push(`The custom domain ${deployment.customDomain} was added to Vercel, but its DNS still needs to be configured.`);
    }
    return { deployment, warnings };
  } catch (error) {
    await markSiteDeploymentFailed(scope, error, env);
    throw error;
  }
};
