import type { ClientExtensionManifest, ContentGraph } from "../../../../types";

export type ClientProvisioningInput = {
  companyName: string;
  domain?: string;
  starterId: string;
  themeId: string;
  ownerEmail: string;
  developerEmail?: string;
  developmentMode?: "managed" | "code";
  repository?: string;
  repositoryBranch?: string;
  repositoryRootDirectory?: string;
  clientExtensionManifest?: unknown;
  enabledPacks: string[];
  deploymentProjectId?: string;
  /** @deprecated Legacy Netlify-only field. Use deploymentProjectId. */
  netlifySiteId?: string;
};

export type NormalizedClientProvisioningInput = Omit<ClientProvisioningInput, "clientExtensionManifest"> & {
  tenantId: string;
  siteId: string;
  siteUrl: string;
  domain?: string;
  enabledPacks: string[];
  developerEmail?: string;
  developmentMode: "managed" | "code";
  repository?: string;
  repositoryBranch: string;
  repositoryRootDirectory?: string;
  clientExtensions: ClientExtensionManifest[];
  deploymentProjectId?: string;
};

export type DeploymentProvider = "vercel" | "netlify";

export type ProvisioningDeployment = {
  provider: DeploymentProvider;
  projectId: string;
  projectName: string;
  productionUrl: string;
  adminUrl: string;
  deploymentId: string;
  status: "deploying" | "ready" | "failed";
  sourceRepository?: string;
  sourceBranch?: string;
  customDomain?: string;
  customDomainVerified?: boolean;
};

export type ClientProvisioningResult = {
  tenantId: string;
  siteId: string;
  workspaceUrl: string;
  ownerEmail: string;
  ownerInvited: boolean;
  developerEmail?: string;
  developerInvited?: boolean;
  developmentMode: "managed" | "code";
  mediaPrefix: string;
  graph: ContentGraph;
  deployment: ProvisioningDeployment;
  warnings: string[];
};

export class ClientProvisioningError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 409 | 502 = 400,
  ) {
    super(message);
    this.name = "ClientProvisioningError";
  }
}
