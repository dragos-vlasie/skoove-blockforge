import { normalizeContentGraph } from "../storage/splitContent";
import {
  insertSiteDeploymentProvisioning,
  markSiteDeploymentFailed,
  readClientHostingSetup,
  updateProvisionedSiteUrl,
  updateSiteDeployment,
} from "./database";
import {
  assertDeploymentProvisioningConfigured,
  deploymentProvider,
  provisionDeploymentSiteForProvider,
} from "./deployment";
import { normalizeProvisioningDomain } from "./seed";
import { ClientProvisioningError, type NormalizedClientProvisioningInput } from "./types";

type ProvisioningEnv = Record<string, string | undefined>;

export type SetupClientDeploymentInput = {
  tenantId: string;
  siteId: string;
  domain?: string;
  deploymentProjectId?: string;
};

export const setupClientDeployment = async (
  rawInput: SetupClientDeploymentInput,
  env: ProvisioningEnv = process.env,
) => {
  const scope = {
    tenantId: String(rawInput.tenantId || "").trim(),
    siteId: String(rawInput.siteId || "").trim(),
  };
  if (!scope.tenantId || !scope.siteId) throw new ClientProvisioningError("Choose a website to set up.");

  const current = await readClientHostingSetup(scope, env);
  let storedGraph = current.graphJson;
  try {
    if (typeof storedGraph === "string") storedGraph = JSON.parse(storedGraph);
  } catch {
    throw new ClientProvisioningError("The saved website content could not be read.", 502);
  }
  const graph = normalizeContentGraph((storedGraph || {}) as Parameters<typeof normalizeContentGraph>[0]);
  const domain = normalizeProvisioningDomain(String(rawInput.domain || ""));
  const provider = deploymentProvider(env);
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
    repositoryBranch: provider === "vercel" ? env.VERCEL_GIT_BRANCH || "main" : env.NETLIFY_GIT_BRANCH || "main",
    deploymentProjectId: String(rawInput.deploymentProjectId || "").trim() || undefined,
    ...domain,
  };

  assertDeploymentProvisioningConfigured(input, env);
  await insertSiteDeploymentProvisioning(scope, input, provider, env);
  try {
    const deployment = await provisionDeploymentSiteForProvider(provider, input, env);
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
