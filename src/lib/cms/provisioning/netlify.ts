import { ClientProvisioningError, type NormalizedClientProvisioningInput, type ProvisioningDeployment } from "./types";

type ProvisioningEnv = Record<string, string | undefined>;

type NetlifyConfig = {
  accessToken: string;
  accountSlug?: string;
  repository: string;
  provider: string;
  branch: string;
  installationId?: number;
  baseDirectory?: string;
  siteNamePrefix: string;
};

type NetlifySite = {
  id: string;
  name: string;
  url?: string;
  ssl_url?: string;
  admin_url?: string;
  account_id?: string;
  custom_domain?: string;
};

type NetlifyBuild = { id?: string; state?: string };
type NetlifyBuildHook = { url?: string };
type NetlifyEnvVar = { key: string };

type NetlifyRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

const readNetlifyConfig = (env: ProvisioningEnv = process.env): NetlifyConfig => {
  const accessToken = env.NETLIFY_ACCESS_TOKEN || env.NETLIFY_AUTH_TOKEN || "";
  const repository = env.NETLIFY_GIT_REPOSITORY || "";
  if (!accessToken) {
    throw new ClientProvisioningError("Netlify provisioning requires NETLIFY_ACCESS_TOKEN.", 502);
  }
  const installationId = Number(env.NETLIFY_GIT_INSTALLATION_ID || 0) || undefined;
  return {
    accessToken,
    accountSlug: env.NETLIFY_ACCOUNT_SLUG || env.NETLIFY_ACCOUNT_ID || undefined,
    repository,
    provider: env.NETLIFY_GIT_PROVIDER || "github",
    branch: env.NETLIFY_GIT_BRANCH || "main",
    installationId,
    baseDirectory: env.NETLIFY_BASE_DIRECTORY || undefined,
    siteNamePrefix: env.NETLIFY_SITE_NAME_PREFIX || "blockforge",
  };
};

const createNetlifyRequest = (
  config: NetlifyConfig,
  fetcher: typeof fetch = fetch,
): NetlifyRequest => async <T>(path: string, init: RequestInit = {}) => {
  const response = await fetcher(`https://api.netlify.com/api/v1${path}`, {
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
      const parsed = JSON.parse(body) as { message?: string; error?: string };
      message = parsed.message || parsed.error || body;
    } catch {
      // Keep the raw response.
    }
    throw new ClientProvisioningError(
      `Netlify request failed (${response.status} ${response.statusText})${message ? `: ${message}` : ""}`,
      502,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const siteName = (config: NetlifyConfig, tenantId: string) =>
  `${config.siteNamePrefix}-${tenantId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

const ensureNetlifySite = async (
  input: NormalizedClientProvisioningInput,
  config: NetlifyConfig,
  request: NetlifyRequest,
) => {
  if (input.deploymentProjectId) {
    const site = await request<NetlifySite>(`/sites/${encodeURIComponent(input.deploymentProjectId)}`);
    if (input.domain && site.custom_domain !== input.domain) {
      return request<NetlifySite>(`/sites/${encodeURIComponent(site.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ custom_domain: input.domain, force_ssl: true }),
      });
    }
    return site;
  }

  const repository = input.repository || config.repository;
  const branch = input.repositoryBranch || config.branch;
  if (!repository) {
    throw new ClientProvisioningError("Creating a Netlify project requires NETLIFY_GIT_REPOSITORY=owner/repository.", 502);
  }

  const path = config.accountSlug
    ? `/${encodeURIComponent(config.accountSlug)}/sites`
    : "/sites";
  return request<NetlifySite>(path, {
    method: "POST",
    body: JSON.stringify({
      name: siteName(config, input.tenantId),
      ...(input.domain ? { custom_domain: input.domain, force_ssl: true } : {}),
      repo: {
        provider: config.provider,
        repo_path: repository,
        repo_branch: branch,
        cmd: "npm run build",
        ...(config.baseDirectory ? { dir: config.baseDirectory } : {}),
        ...(config.installationId ? { installation_id: config.installationId } : {}),
      },
    }),
  });
};

const createBuildHook = async (
  site: NetlifySite,
  branch: string,
  request: NetlifyRequest,
) => {
  const hook = await request<NetlifyBuildHook>(`/sites/${encodeURIComponent(site.id)}/build_hooks`, {
    method: "POST",
    body: JSON.stringify({ title: "BlockForge CMS publish", branch }),
  });
  if (!hook.url) throw new ClientProvisioningError("Netlify did not return a build-hook URL.", 502);
  return hook.url;
};

type ProvisionedEnvVar = {
  key: string;
  value: string;
  secret: boolean;
};

export const createNetlifySiteEnvironment = (
  input: NormalizedClientProvisioningInput,
  buildHookUrl: string,
  env: ProvisioningEnv = process.env,
): ProvisionedEnvVar[] => {
  const contentApiUrl = env.BLOCKFORGE_CONTENT_API_URL || env.CMS_APP_URL || "";
  const values: Array<ProvisionedEnvVar | null> = [
    { key: "CMS_CONTENT_STORE", value: "remote", secret: false },
    { key: "BLOCKFORGE_CONTENT_API_URL", value: contentApiUrl, secret: false },
    { key: "BLOCKFORGE_ANALYTICS_API_URL", value: contentApiUrl, secret: false },
    { key: "BLOCKFORGE_CONTENT_REVALIDATE_SECONDS", value: env.BLOCKFORGE_CONTENT_REVALIDATE_SECONDS || "60", secret: false },
    { key: "CMS_TENANT_ID", value: input.tenantId, secret: false },
    { key: "CMS_SITE_ID", value: input.siteId, secret: false },
    { key: "CMS_DEVELOPMENT_MODE", value: input.developmentMode, secret: false },
    { key: "CMS_PUBLISH_WEBHOOK_URL", value: buildHookUrl, secret: true },
    env.NEXT_PUBLIC_CMS_IMAGE_HOSTS
      ? { key: "NEXT_PUBLIC_CMS_IMAGE_HOSTS", value: env.NEXT_PUBLIC_CMS_IMAGE_HOSTS, secret: false }
      : null,
  ];

  const filtered = values.filter((entry): entry is ProvisionedEnvVar => Boolean(entry?.value));
  const requiredKeys = ["BLOCKFORGE_CONTENT_API_URL"];
  const missing = requiredKeys.filter((key) => !filtered.some((entry) => entry.key === key));
  if (missing.length > 0) {
    throw new ClientProvisioningError(`Cannot configure Netlify; missing ${missing.join(", ")}.`, 502);
  }
  return filtered;
};

const setNetlifyEnvironment = async (
  site: NetlifySite,
  variables: ProvisionedEnvVar[],
  request: NetlifyRequest,
) => {
  if (!site.account_id) throw new ClientProvisioningError("Netlify did not return the site's account ID.", 502);
  const query = `?site_id=${encodeURIComponent(site.id)}`;
  const existing = await request<NetlifyEnvVar[]>(`/accounts/${encodeURIComponent(site.account_id)}/env${query}`);
  const existingKeys = new Set(existing.map((entry) => entry.key));
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
  await Promise.all(
    [...existingKeys]
      .filter((key) => unsafeLegacyKeys.has(key))
      .map((key) => request(`/accounts/${encodeURIComponent(site.account_id!)}/env/${encodeURIComponent(key)}${query}`, {
        method: "DELETE",
      })),
  );
  unsafeLegacyKeys.forEach((key) => existingKeys.delete(key));

  const valueOf = (entry: ProvisionedEnvVar) => ({
    key: entry.key,
    values: [{ context: "all", value: entry.value }],
    is_secret: entry.secret,
  });
  const newVariables = variables.filter((entry) => !existingKeys.has(entry.key));
  if (newVariables.length > 0) {
    await request(`/accounts/${encodeURIComponent(site.account_id)}/env${query}`, {
      method: "POST",
      body: JSON.stringify(newVariables.map(valueOf)),
    });
  }

  await Promise.all(
    variables
      .filter((entry) => existingKeys.has(entry.key))
      .map((entry) => request(`/accounts/${encodeURIComponent(site.account_id!)}/env/${encodeURIComponent(entry.key)}${query}`, {
        method: "PUT",
        body: JSON.stringify(valueOf(entry)),
      })),
  );
};

const startNetlifyBuild = async (
  siteId: string,
  title: string,
  request: NetlifyRequest,
) => request<NetlifyBuild>(
  `/sites/${encodeURIComponent(siteId)}/builds?title=${encodeURIComponent(title)}`,
  { method: "POST", body: JSON.stringify({}) },
);

export const provisionNetlifySite = async (
  input: NormalizedClientProvisioningInput,
  env: ProvisioningEnv = process.env,
  fetcher: typeof fetch = fetch,
): Promise<ProvisioningDeployment> => {
  const config = readNetlifyConfig(env);
  const request = createNetlifyRequest(config, fetcher);
  const site = await ensureNetlifySite(input, config, request);
  const buildHookUrl = await createBuildHook(site, input.repositoryBranch || config.branch, request);
  await setNetlifyEnvironment(site, createNetlifySiteEnvironment(input, buildHookUrl, env), request);
  const build = await startNetlifyBuild(site.id, `Initial BlockForge deploy for ${input.companyName}`, request);

  return {
    provider: "netlify",
    projectId: site.id,
    projectName: site.name,
    productionUrl: input.siteUrl || site.ssl_url || site.url || "",
    adminUrl: site.admin_url || `https://app.netlify.com/sites/${site.name}`,
    deploymentId: build.id || "",
    status: build.state === "ready" ? "ready" : "deploying",
    sourceRepository: input.repository || config.repository,
    sourceBranch: input.repositoryBranch || config.branch,
  };
};

export const triggerNetlifyBuild = async (
  siteId: string,
  title: string,
  env: ProvisioningEnv = process.env,
  fetcher: typeof fetch = fetch,
) => {
  const config = readNetlifyConfig(env);
  return startNetlifyBuild(siteId, title, createNetlifyRequest(config, fetcher));
};

export const assertNetlifyProvisioningConfigured = (
  input: Pick<NormalizedClientProvisioningInput, "deploymentProjectId" | "repository">,
  env: ProvisioningEnv = process.env,
) => {
  const config = readNetlifyConfig(env);
  if (!input.deploymentProjectId && !input.repository && !config.repository) {
    throw new ClientProvisioningError("Creating a Netlify project requires NETLIFY_GIT_REPOSITORY=owner/repository.", 502);
  }
  if (!env.BLOCKFORGE_CONTENT_API_URL && !env.CMS_APP_URL) {
    throw new ClientProvisioningError(
      "Netlify client sites require BLOCKFORGE_CONTENT_API_URL or CMS_APP_URL.",
      502,
    );
  }
};
