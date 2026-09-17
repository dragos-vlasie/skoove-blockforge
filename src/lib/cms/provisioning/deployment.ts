import { assertNetlifyProvisioningConfigured, provisionNetlifySite, triggerNetlifyBuild } from "./netlify";
import type { NormalizedClientProvisioningInput, ProvisioningDeployment, DeploymentProvider } from "./types";
import { assertVercelProvisioningConfigured, provisionVercelSite, readVercelDeploymentStatus, triggerVercelDeployment } from "./vercel";

type ProvisioningEnv = Record<string, string | undefined>;

export const deploymentProvider = (env: ProvisioningEnv = process.env): DeploymentProvider =>
  String(env.CMS_DEPLOYMENT_PROVIDER || "vercel").trim().toLowerCase() === "netlify"
    ? "netlify"
    : "vercel";

export const assertDeploymentProvisioningConfigured = (
  input: NormalizedClientProvisioningInput,
  env: ProvisioningEnv = process.env,
) => {
  if (deploymentProvider(env) === "netlify") {
    return assertNetlifyProvisioningConfigured(input, env);
  }
  return assertVercelProvisioningConfigured(input, env);
};

export const provisionDeploymentSite = (
  input: NormalizedClientProvisioningInput,
  env: ProvisioningEnv = process.env,
): Promise<ProvisioningDeployment> => deploymentProvider(env) === "netlify"
  ? provisionNetlifySite(input, env)
  : provisionVercelSite(input, env);

export const provisionDeploymentSiteForProvider = (
  provider: DeploymentProvider,
  input: NormalizedClientProvisioningInput,
  env: ProvisioningEnv = process.env,
): Promise<ProvisioningDeployment> => provider === "netlify"
  ? provisionNetlifySite(input, env)
  : provisionVercelSite(input, env);

export const triggerProviderDeployment = async (
  provider: DeploymentProvider,
  projectId: string,
  sourceRepository: string,
  sourceBranch: string,
  title: string,
  env: ProvisioningEnv = process.env,
) => {
  if (provider === "vercel") {
    return triggerVercelDeployment(projectId, sourceRepository, sourceBranch, env);
  }

  const build = await triggerNetlifyBuild(projectId, title, env);
  return {
    id: String(build.id || ""),
    state: build.state === "ready" ? "ready" as const : "deploying" as const,
  };
};

export const readProviderDeploymentStatus = (
  provider: DeploymentProvider,
  projectId: string,
  env: ProvisioningEnv = process.env,
) => provider === "vercel"
  ? readVercelDeploymentStatus(projectId, env)
  : Promise.resolve(null);
