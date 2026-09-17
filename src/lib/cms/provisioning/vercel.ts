import { ClientProvisioningError, type NormalizedClientProvisioningInput, type ProvisioningDeployment } from "./types";
import { derivePreviewSecret } from "../../preview/token";

type ProvisioningEnv = Record<string, string | undefined>;

type VercelConfig = {
  accessToken: string;
  teamId?: string;
  teamSlug?: string;
  repository: string;
  branch: string;
  rootDirectory?: string;
  codeRootDirectory?: string;
  projectNamePrefix: string;
};

type VercelProject = {
  id: string;
  name: string;
  rootDirectory?: string | null;
  targets?: {
    production?: VercelDeployment;
  };
  link?: {
    type?: string;
    repoId?: string | number;
    org?: string;
    repo?: string;
    productionBranch?: string;
  };
};

type VercelDeployment = {
  id?: string;
  url?: string;
  readyState?: string;
  alias?: string[];
};

type VercelDomainList = {
  domains?: VercelDomain[];
};

type VercelDomain = {
  name?: string;
  verified?: boolean;
};

type VercelEnvVariable = {
  key: string;
  value: string;
  type: "plain" | "encrypted";
  target: Array<"production" | "preview" | "development">;
};

type ExistingVercelEnvVariable = {
  id: string;
  key: string;
};

type VercelEnvironmentList = {
  envs?: ExistingVercelEnvVariable[];
};

type VercelRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

const readVercelConfig = (env: ProvisioningEnv = process.env): VercelConfig => {
  const accessToken = env.VERCEL_ACCESS_TOKEN || env.VERCEL_TOKEN || "";
  if (!accessToken) {
    throw new ClientProvisioningError("Vercel provisioning requires VERCEL_ACCESS_TOKEN.", 502);
  }

  return {
    accessToken,
    teamId: env.VERCEL_TEAM_ID || undefined,
    teamSlug: env.VERCEL_TEAM_SLUG || undefined,
    repository: env.VERCEL_GIT_REPOSITORY || "",
    branch: env.VERCEL_GIT_BRANCH || "main",
    rootDirectory: env.VERCEL_ROOT_DIRECTORY || "apps/site",
    codeRootDirectory: env.VERCEL_CODE_ROOT_DIRECTORY || undefined,
    projectNamePrefix: env.VERCEL_PROJECT_NAME_PREFIX || "blockforge",
  };
};

const createVercelRequest = (
  config: VercelConfig,
  fetcher: typeof fetch = fetch,
): VercelRequest => async <T>(path: string, init: RequestInit = {}) => {
  const url = new URL(path, "https://api.vercel.com");
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  else if (config.teamSlug) url.searchParams.set("slug", config.teamSlug);

  const response = await fetcher(url, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${config.accessToken}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message || parsed.message || body;
    } catch {
      // Keep the raw response.
    }
    throw new ClientProvisioningError(
      `Vercel request failed (${response.status} ${response.statusText})${message ? `: ${message}` : ""}`,
      502,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const projectName = (config: VercelConfig, tenantId: string) =>
  `${config.projectNamePrefix}-${tenantId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

export const vercelProjectNameForTenant = (
  tenantId: string,
  env: ProvisioningEnv = process.env,
) => projectName(readVercelConfig(env), tenantId);

const resolveRepository = (
  input: Pick<NormalizedClientProvisioningInput, "repository" | "repositoryBranch">,
  config: VercelConfig,
) => ({
  repository: input.repository || config.repository,
  branch: input.repositoryBranch || config.branch,
});

const createVercelSiteEnvironment = (
  input: NormalizedClientProvisioningInput,
  env: ProvisioningEnv = process.env,
): VercelEnvVariable[] => {
  const contentApiUrl = env.BLOCKFORGE_CONTENT_API_URL || env.CMS_APP_URL || "";
  const previewSecret = input.developmentMode === "code"
    ? derivePreviewSecret(String(env.CMS_SESSION_SECRET || ""), input.tenantId, input.siteId)
    : "";
  const values: Array<{ key: string; value: string; secret: boolean } | null> = [
    { key: "CMS_CONTENT_STORE", value: "remote", secret: false },
    { key: "BLOCKFORGE_CONTENT_API_URL", value: contentApiUrl, secret: false },
    { key: "BLOCKFORGE_ANALYTICS_API_URL", value: contentApiUrl, secret: false },
    { key: "BLOCKFORGE_CONTENT_REVALIDATE_SECONDS", value: env.BLOCKFORGE_CONTENT_REVALIDATE_SECONDS || "60", secret: false },
    { key: "CMS_TENANT_ID", value: input.tenantId, secret: false },
    { key: "CMS_SITE_ID", value: input.siteId, secret: false },
    { key: "CMS_DEVELOPMENT_MODE", value: input.developmentMode, secret: false },
    previewSecret
      ? { key: "BLOCKFORGE_PREVIEW_SECRET", value: previewSecret, secret: true }
      : null,
    env.NEXT_PUBLIC_CMS_IMAGE_HOSTS
      ? { key: "NEXT_PUBLIC_CMS_IMAGE_HOSTS", value: env.NEXT_PUBLIC_CMS_IMAGE_HOSTS, secret: false }
      : null,
  ];

  const filtered = values.filter((entry): entry is { key: string; value: string; secret: boolean } => Boolean(entry?.value));
  const requiredKeys = [
    "BLOCKFORGE_CONTENT_API_URL",
    ...(input.developmentMode === "code" ? ["BLOCKFORGE_PREVIEW_SECRET"] : []),
  ];
  const missing = requiredKeys.filter((key) => !filtered.some((entry) => entry.key === key));
  if (missing.length > 0) {
    throw new ClientProvisioningError(`Cannot configure Vercel; missing ${missing.join(", ")}.`, 502);
  }

  return filtered.map((entry) => ({
    key: entry.key,
    value: entry.value,
    type: entry.secret ? "encrypted" : "plain",
    target: ["production", "preview", "development"],
  }));
};

const ensureVercelProject = async (
  input: NormalizedClientProvisioningInput,
  config: VercelConfig,
  request: VercelRequest,
) => {
  const requestedRootDirectory = input.developmentMode === "code"
    ? input.repositoryRootDirectory
    : config.rootDirectory;
  if (input.deploymentProjectId) {
    const project = await request<VercelProject>(`/v9/projects/${encodeURIComponent(input.deploymentProjectId)}`);
    if (requestedRootDirectory && project.rootDirectory !== requestedRootDirectory) {
      return request<VercelProject>(`/v9/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ rootDirectory: requestedRootDirectory }),
      });
    }
    return project;
  }

  const { repository } = resolveRepository(input, config);
  if (!repository) {
    throw new ClientProvisioningError("Creating a Vercel project requires VERCEL_GIT_REPOSITORY=owner/repository.", 502);
  }

  const rootDirectory = input.developmentMode === "code"
    ? input.repositoryRootDirectory || config.codeRootDirectory
    : config.rootDirectory;

  return request<VercelProject>("/v11/projects", {
    method: "POST",
    body: JSON.stringify({
      name: projectName(config, input.tenantId),
      framework: "nextjs",
      gitRepository: { type: "github", repo: repository },
      ...(rootDirectory ? { rootDirectory } : {}),
    }),
  });
};

const setVercelEnvironment = async (
  project: VercelProject,
  variables: VercelEnvVariable[],
  request: VercelRequest,
) => {
  const unsafeLegacyKeys = new Set([
    "CMS_DATABASE_URL",
    "DATABASE_URL",
    "CMS_DATABASE_SSL",
    "CMS_DATABASE_AUTO_MIGRATE",
    "CMS_MEDIA_STORE",
    "CMS_SUPABASE_URL",
    "CMS_SUPABASE_SECRET_KEY",
    "CMS_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]);
  const existing = await request<VercelEnvironmentList>(
    `/v9/projects/${encodeURIComponent(project.id)}/env`,
  );
  await Promise.all(
    (existing.envs || [])
      .filter((entry) => unsafeLegacyKeys.has(entry.key))
      .map((entry) => request(`/v9/projects/${encodeURIComponent(project.id)}/env/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
      })),
  );
  await request(`/v10/projects/${encodeURIComponent(project.id)}/env?upsert=true`, {
    method: "POST",
    body: JSON.stringify(variables),
  });
};

const ensureVercelDomain = async (
  project: VercelProject,
  domain: string,
  request: VercelRequest,
) => {
  const result = await request<VercelDomainList>(`/v9/projects/${encodeURIComponent(project.id)}/domains?limit=100`);
  const existing = result.domains?.find((entry) => entry.name === domain);
  if (existing) return existing;
  return request<VercelDomain>(`/v10/projects/${encodeURIComponent(project.id)}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
};

const gitSourceFor = (
  project: VercelProject,
  repository: string,
  branch: string,
) => {
  if (project.link?.repoId !== undefined) {
    return { type: "github", repoId: project.link.repoId, ref: branch };
  }

  const linkedRepository = project.link?.org && project.link.repo
    ? `${project.link.org}/${project.link.repo}`
    : repository;
  const [org, repo] = linkedRepository.split("/");
  if (!org || !repo) {
    throw new ClientProvisioningError("The Vercel project is not connected to a GitHub repository.", 502);
  }
  return { type: "github", org, repo, ref: branch };
};

const startVercelDeployment = async (
  project: VercelProject,
  repository: string,
  branch: string,
  request: VercelRequest,
) => request<VercelDeployment>("/v13/deployments", {
  method: "POST",
  body: JSON.stringify({
    name: project.name,
    project: project.id,
    target: "production",
    gitSource: gitSourceFor(project, repository, branch),
  }),
});

const deploymentStatus = (readyState?: string): ProvisioningDeployment["status"] => {
  if (readyState === "READY") return "ready";
  if (["ERROR", "CANCELED"].includes(readyState || "")) return "failed";
  return "deploying";
};

const productionUrlFor = (project: VercelProject, deployment?: VercelDeployment) => {
  const aliases = deployment?.alias || [];
  const expectedAlias = `${project.name}.vercel.app`;
  const stableAlias = aliases.find((alias) => alias === expectedAlias)
    || aliases.find((alias) => alias.endsWith(".vercel.app") && !alias.includes("-git-") && alias !== deployment?.url);
  const hostname = stableAlias || deployment?.url || "";
  return hostname ? `https://${hostname}` : "";
};

export const readVercelDeploymentStatus = async (
  projectId: string,
  env: ProvisioningEnv = process.env,
  fetcher: typeof fetch = fetch,
) => {
  const config = readVercelConfig(env);
  const request = createVercelRequest(config, fetcher);
  const project = await request<VercelProject>(`/v9/projects/${encodeURIComponent(projectId)}`);
  const deployment = project.targets?.production;
  return {
    deploymentId: deployment?.id || "",
    status: deploymentStatus(deployment?.readyState),
    productionUrl: productionUrlFor(project, deployment),
  };
};

export const provisionVercelSite = async (
  input: NormalizedClientProvisioningInput,
  env: ProvisioningEnv = process.env,
  fetcher: typeof fetch = fetch,
): Promise<ProvisioningDeployment> => {
  const config = readVercelConfig(env);
  const request = createVercelRequest(config, fetcher);
  const project = await ensureVercelProject(input, config, request);
  const source = resolveRepository(input, config);
  const branch = input.repositoryBranch || project.link?.productionBranch || source.branch;

  await setVercelEnvironment(project, createVercelSiteEnvironment(input, env), request);
  const customDomain = input.domain
    ? await ensureVercelDomain(project, input.domain, request)
    : undefined;
  const deployment = await startVercelDeployment(project, source.repository, branch, request);

  return {
    provider: "vercel",
    projectId: project.id,
    projectName: project.name,
    productionUrl: input.siteUrl || productionUrlFor(project, deployment),
    adminUrl: config.teamSlug
      ? `https://vercel.com/${config.teamSlug}/${project.name}`
      : `https://vercel.com/~/project/${project.name}`,
    deploymentId: deployment.id || "",
    status: deploymentStatus(deployment.readyState),
    sourceRepository: source.repository || (project.link?.org && project.link.repo ? `${project.link.org}/${project.link.repo}` : undefined),
    sourceBranch: branch,
    customDomain: customDomain?.name,
    customDomainVerified: customDomain?.verified,
  };
};

export const triggerVercelDeployment = async (
  projectId: string,
  repository: string,
  branch: string,
  env: ProvisioningEnv = process.env,
  fetcher: typeof fetch = fetch,
) => {
  const config = readVercelConfig(env);
  const request = createVercelRequest(config, fetcher);
  const project = await request<VercelProject>(`/v9/projects/${encodeURIComponent(projectId)}`);
  const sourceRepository = repository || config.repository;
  const sourceBranch = branch || project.link?.productionBranch || config.branch;
  const deployment = await startVercelDeployment(project, sourceRepository, sourceBranch, request);
  return { id: deployment.id || "", state: deploymentStatus(deployment.readyState) };
};

export const assertVercelProvisioningConfigured = (
  input: Pick<NormalizedClientProvisioningInput, "deploymentProjectId" | "repository">,
  env: ProvisioningEnv = process.env,
) => {
  const config = readVercelConfig(env);
  if (!input.deploymentProjectId && !input.repository && !config.repository) {
    throw new ClientProvisioningError("Creating a Vercel project requires VERCEL_GIT_REPOSITORY=owner/repository.", 502);
  }
  if (!env.BLOCKFORGE_CONTENT_API_URL && !env.CMS_APP_URL) {
    throw new ClientProvisioningError(
      "Vercel client sites require BLOCKFORGE_CONTENT_API_URL or CMS_APP_URL.",
      502,
    );
  }
};
