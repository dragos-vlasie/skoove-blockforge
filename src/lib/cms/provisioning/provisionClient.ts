import { cmsWorkspaceHref } from "../workspaceTypes";
import { assertTenantAvailable, insertProvisionedTenant, markSiteDeploymentFailed, updateProvisionedSiteUrl, updateSiteDeployment } from "./database";
import { assertDeploymentProvisioningConfigured, deploymentProvider, provisionDeploymentSite } from "./deployment";
import { createProvisionedContentGraph, normalizeClientProvisioningInput } from "./seed";
import { assertSupabaseProvisioningConfigured, ensureClientMediaNamespace, inviteClientDeveloper, inviteClientOwner } from "./supabaseAdmin";
import type { ClientProvisioningInput, ClientProvisioningResult, ProvisioningDeployment } from "./types";

type ProvisioningEnv = Record<string, string | undefined>;

export const provisionClient = async (
  rawInput: ClientProvisioningInput,
  env: ProvisioningEnv = process.env,
): Promise<ClientProvisioningResult> => {
  const input = normalizeClientProvisioningInput(rawInput);
  const provider = deploymentProvider(env);
  assertSupabaseProvisioningConfigured(env);
  assertDeploymentProvisioningConfigured(input, env);
  await assertTenantAvailable(input.tenantId, env);

  const graph = createProvisionedContentGraph(input);
  const owner = await inviteClientOwner(input.ownerEmail, env);
  const developer = input.developerEmail
    ? await inviteClientDeveloper(input.developerEmail, env)
    : undefined;
  const media = await ensureClientMediaNamespace(input.tenantId, input.siteId, env);
  await insertProvisionedTenant(input, graph, owner.user.id, developer?.user.id, provider, env);

  const warnings: string[] = [];
  let deployment: ProvisioningDeployment;
  try {
    deployment = await provisionDeploymentSite(input, env);
    await updateSiteDeployment(input, deployment, env);
    if (!graph.site.siteUrl && deployment.productionUrl) {
      graph.site.siteUrl = deployment.productionUrl;
      await updateProvisionedSiteUrl(input, deployment.productionUrl, env);
    }
    if (deployment.customDomain && deployment.customDomainVerified === false) {
      warnings.push(`The custom domain ${deployment.customDomain} was added to Vercel, but its DNS still needs to be configured.`);
    }
  } catch (error) {
    await markSiteDeploymentFailed(input, error, env);
    const message = error instanceof Error ? error.message : "Hosting provisioning failed.";
    warnings.push(message);
    deployment = {
      provider,
      projectId: input.deploymentProjectId || "",
      projectName: "",
      productionUrl: input.siteUrl,
      adminUrl: "",
      deploymentId: "",
      status: "failed",
      sourceRepository: input.repository || (provider === "vercel" ? env.VERCEL_GIT_REPOSITORY : env.NETLIFY_GIT_REPOSITORY),
      sourceBranch: input.repositoryBranch || (provider === "vercel" ? env.VERCEL_GIT_BRANCH : env.NETLIFY_GIT_BRANCH),
    };
  }

  return {
    tenantId: input.tenantId,
    siteId: input.siteId,
    workspaceUrl: cmsWorkspaceHref(input),
    ownerEmail: input.ownerEmail,
    ownerInvited: owner.invited,
    developerEmail: input.developerEmail,
    developerInvited: developer?.invited,
    developmentMode: input.developmentMode,
    mediaPrefix: `${media.bucket}/${media.prefix}`,
    graph,
    deployment,
    warnings,
  };
};

export type { ClientProvisioningInput, ClientProvisioningResult } from "./types";
