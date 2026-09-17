import type { ContentGraph } from "../../../../types";
import { packManifests } from "../../../packs/registry";
import { applyStarterToGraph, starterDefinitions } from "../../../starters/registry";
import { createDesignFromThemePreset, themePresets } from "../../../themes/registry";
import { normalizeContentGraph } from "../storage/splitContent";
import { ClientProvisioningError, type ClientProvisioningInput, type NormalizedClientProvisioningInput } from "./types";
import { parseClientExtensionManifest } from "../../../extensions/manifest";

const tenantSlug = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 63);

export const normalizeProvisioningDomain = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return { domain: undefined, siteUrl: "" };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new ClientProvisioningError("Enter a valid production domain.");
  }

  if (
    !url.hostname ||
    url.username ||
    url.password ||
    url.port ||
    (url.pathname && url.pathname !== "/") ||
    url.search ||
    url.hash
  ) {
    throw new ClientProvisioningError("Enter a domain without credentials, a custom port, path, query, or fragment.");
  }

  const hostname = url.hostname.toLowerCase();
  const publicHostname = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!publicHostname.test(hostname)) {
    throw new ClientProvisioningError("Enter a valid custom domain such as example.com, or leave it blank.");
  }
  return {
    domain: hostname,
    siteUrl: `https://${hostname}`,
  };
};

export const normalizeClientProvisioningInput = (
  input: ClientProvisioningInput,
): NormalizedClientProvisioningInput => {
  const companyName = String(input.companyName || "").trim();
  const ownerEmail = String(input.ownerEmail || "").trim().toLowerCase();
  const rawDeveloperEmail = String(input.developerEmail || "").trim().toLowerCase();
  const developerEmail = rawDeveloperEmail && rawDeveloperEmail !== ownerEmail
    ? rawDeveloperEmail
    : undefined;
  const starterId = String(input.starterId || "").trim();
  const themeId = String(input.themeId || "").trim();
  const developmentMode = input.developmentMode === "code" ? "code" : "managed";
  let clientExtensions: NormalizedClientProvisioningInput["clientExtensions"] = [];
  if (input.clientExtensionManifest !== undefined && input.clientExtensionManifest !== null) {
    if (developmentMode !== "code") {
      throw new ClientProvisioningError("Client extension manifests are available only in Code mode.");
    }
    try {
      clientExtensions = [parseClientExtensionManifest(input.clientExtensionManifest)];
    } catch {
      throw new ClientProvisioningError("Enter a valid BlockForge client extension manifest.");
    }
  }
  const repository = String(input.repository || "").trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const repositoryBranch = String(input.repositoryBranch || "").trim() || (developmentMode === "code" ? "main" : "");
  const repositoryRootDirectory = String(input.repositoryRootDirectory || "").trim().replace(/^\.\//, "").replace(/\/$/, "");
  const deploymentProjectId = String(input.deploymentProjectId || input.netlifySiteId || "").trim() || undefined;
  const tenantId = tenantSlug(companyName);
  const domain = normalizeProvisioningDomain(String(input.domain || ""));
  const availablePackIds = new Set<string>(packManifests.map((pack) => pack.id));
  const enabledPacks = Array.from(new Set(["core", ...(input.enabledPacks || [])]))
    .filter((packId) => availablePackIds.has(packId));

  if (!companyName || !tenantId) throw new ClientProvisioningError("Enter the client or company name.");
  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) throw new ClientProvisioningError("Enter a valid owner email address.");
  if (developerEmail && !/^\S+@\S+\.\S+$/.test(developerEmail)) {
    throw new ClientProvisioningError("Enter a valid developer email address.");
  }
  if (repository && !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repository)) {
    throw new ClientProvisioningError("Enter the GitHub repository as owner/repository.");
  }
  if (/\s/.test(repositoryBranch)) {
    throw new ClientProvisioningError("The repository branch cannot contain spaces.");
  }
  if (repositoryRootDirectory && (repositoryRootDirectory.startsWith("/") || repositoryRootDirectory.split("/").includes(".."))) {
    throw new ClientProvisioningError("The repository root directory must stay inside the client repository.");
  }
  if (developmentMode === "code" && !repository && !deploymentProjectId) {
    throw new ClientProvisioningError("Code mode requires a dedicated GitHub repository or an existing hosting Project ID.");
  }
  if (!starterDefinitions.some((starter) => starter.id === starterId)) {
    throw new ClientProvisioningError("Choose a valid website starter.");
  }
  if (!themePresets.some((theme) => theme.id === themeId)) {
    throw new ClientProvisioningError("Choose a valid website theme.");
  }

  return {
    companyName,
    ownerEmail,
    developerEmail,
    developmentMode,
    repository: repository || undefined,
    repositoryBranch,
    repositoryRootDirectory: repositoryRootDirectory || undefined,
    clientExtensions,
    starterId,
    themeId,
    enabledPacks,
    deploymentProjectId,
    netlifySiteId: String(input.netlifySiteId || "").trim() || undefined,
    tenantId,
    siteId: "main",
    ...domain,
  };
};

export const createProvisionedContentGraph = (
  input: NormalizedClientProvisioningInput,
): ContentGraph => {
  const createdAt = new Date().toISOString();
  const graph: ContentGraph = {
    version: 1,
    updatedAt: createdAt,
    site: {
      siteName: input.companyName,
      siteUrl: input.siteUrl,
      starterId: input.starterId,
      enabledPacks: input.enabledPacks,
      clientExtensions: input.clientExtensions,
      editorMode: "client",
      logo: "",
      favicon: "/favicon.ico",
      defaultLocale: "en",
      defaultTitlePattern: `%s | ${input.companyName}`,
      defaultDescription: `${input.companyName} website.`,
      defaultOgImage: "",
      design: createDesignFromThemePreset(input.themeId),
      enabledFeatures: {
        contentModels: false,
        mediaLibrary: true,
        sharedBlocks: true,
      },
      organization: {
        name: input.companyName,
        logo: "",
        sameAs: [],
      },
      socialProfiles: [],
    },
    pages: [],
    collectionDefinitions: [],
    entries: [],
    categories: [],
    sharedBlocks: [],
    navigation: [],
    assets: [],
    redirects: [],
    customBlueprints: [],
    blueprintAssignments: [],
  };

  applyStarterToGraph(graph, input.starterId);
  graph.site.siteName = input.companyName;
  graph.site.siteUrl = input.siteUrl;
  graph.site.starterId = input.starterId;
  graph.site.enabledPacks = input.enabledPacks;
  graph.site.clientExtensions = input.clientExtensions;
  graph.site.editorMode = "client";
  graph.site.defaultTitlePattern = `%s | ${input.companyName}`;
  graph.site.organization.name = input.companyName;
  graph.site.design = createDesignFromThemePreset(input.themeId);
  graph.updatedAt = createdAt;
  graph.pages.forEach((page) => {
    page.status = "published";
    page.updatedAt = createdAt;
  });
  graph.entries.forEach((entry) => {
    entry.status = "published";
    entry.updatedAt = createdAt;
  });
  graph.sharedBlocks.forEach((block) => {
    block.status = "published";
    block.updatedAt = createdAt;
  });

  return normalizeContentGraph(graph);
};
