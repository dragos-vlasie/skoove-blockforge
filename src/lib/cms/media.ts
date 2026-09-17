import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import type { AssetMeta } from "../../../types";
import { createGitHubContentStoreConfig } from "./storage/githubContentStore";
import { readRuntimeEnv } from "./storage/env";
import type { CmsWorkspaceScope } from "./workspaceTypes";

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const maxUploadBytes = 10 * 1024 * 1024;

type GitRefResponse = { object: { sha: string } };
type GitCommitResponse = { sha: string; tree: { sha: string } };
type GitCreateBlobResponse = { sha: string };
type GitCreateTreeResponse = { sha: string };
type GitCreateCommitResponse = { sha: string };
type MediaStoreMode = "local" | "github" | "supabase";
type SupabaseStorageConfig = {
  url: string;
  secretKey: string;
  bucket: string;
  tenantId: string;
  siteId: string;
};

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");
const joinGitPath = (...parts: string[]) => parts.map(trimSlashes).filter(Boolean).join("/");
const encodeRefPath = (value: string) => value.split("/").map(encodeURIComponent).join("/");
const encodeObjectPath = (value: string) => value.split("/").map(encodeURIComponent).join("/");
const trimTrailingSlash = (value: string) => value.replace(/\/+$/g, "");

const slugifyFilePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const normalizeExtension = (value: string) => value.toLowerCase().replace(/^jpeg$/, "jpg");

const getUrlExtension = (url: string) => {
  try {
    return normalizeExtension(extname(new URL(url, "http://local").pathname).replace(".", ""));
  } catch {
    return normalizeExtension(extname(url).replace(".", ""));
  }
};

const getImageDimensions = (bytes: Buffer, mimeType: string) => {
  if (mimeType === "image/png" && bytes.length >= 24) {
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }

  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return {
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  if (mimeType === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    const chunkType = bytes.toString("ascii", 12, 16);
    if (chunkType === "VP8X" && bytes.length >= 30) {
      return {
        width: 1 + bytes.readUIntLE(24, 3),
        height: 1 + bytes.readUIntLE(27, 3),
      };
    }
    if (chunkType === "VP8L" && bytes.length >= 25) {
      const bits = bytes.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
  }

  return {};
};

const readMediaStoreMode = (): MediaStoreMode => {
  const env = readRuntimeEnv();
  const contentStoreMode = String(env.CMS_CONTENT_STORE || "local").toLowerCase();
  const fallbackMediaStore = contentStoreMode === "github" ? "github" : "local";
  const mode = String(env.CMS_MEDIA_STORE || fallbackMediaStore).toLowerCase();

  if (mode === "local" || mode === "github" || mode === "supabase") return mode;
  throw new Error(`Unsupported CMS_MEDIA_STORE "${mode}". Use local, github, or supabase.`);
};

const createSupabaseStorageConfig = (scope?: CmsWorkspaceScope): SupabaseStorageConfig => {
  const env = readRuntimeEnv();
  const url = env.CMS_SUPABASE_URL || env.SUPABASE_URL;
  const secretKey =
    env.CMS_SUPABASE_SECRET_KEY ||
    env.SUPABASE_SECRET_KEY ||
    env.CMS_SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = env.CMS_SUPABASE_STORAGE_BUCKET || env.SUPABASE_STORAGE_BUCKET || "cms-media";

  if (!url) {
    throw new Error("CMS_MEDIA_STORE=supabase requires CMS_SUPABASE_URL or SUPABASE_URL.");
  }

  if (!secretKey) {
    throw new Error("CMS_MEDIA_STORE=supabase requires CMS_SUPABASE_SECRET_KEY. Legacy CMS_SUPABASE_SERVICE_ROLE_KEY is still supported.");
  }

  return {
    url: trimTrailingSlash(url),
    secretKey,
    bucket,
    tenantId: scope?.tenantId || env.CMS_TENANT_ID || "local",
    siteId: scope?.siteId || env.CMS_SITE_ID || "main",
  };
};

const supabaseStorageRequest = async (
  path: string,
  init: Omit<RequestInit, "body"> & { body?: BodyInit | null } = {},
) => {
  const config = createSupabaseStorageConfig();
  const { headers, ...rest } = init;
  const response = await fetch(`${config.url}${path}`, {
    ...rest,
    headers: {
      apikey: config.secretKey,
      authorization: `Bearer ${config.secretKey}`,
      ...headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      // Keep raw text.
    }
    throw new Error(`Supabase media request failed (${response.status} ${response.statusText})${message ? `: ${message}` : ""}`);
  }

  return response;
};

const createSupabaseObjectPath = (filename: string, scope?: CmsWorkspaceScope) => {
  const config = createSupabaseStorageConfig(scope);
  const year = new Date().getUTCFullYear();
  return [config.tenantId, config.siteId, String(year), filename].map(trimSlashes).join("/");
};

const getSupabasePublicUrl = (bucket: string, objectPath: string) => {
  const config = createSupabaseStorageConfig();
  return `${config.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;
};

const uploadSupabaseMediaFile = async (bucket: string, objectPath: string, bytes: Buffer, mimeType: string) => {
  await supabaseStorageRequest(`/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`, {
    method: "POST",
    headers: {
      "cache-control": "31536000",
      "content-type": mimeType,
      "x-upsert": "true",
    },
    body: bytes,
  });
};

const deleteSupabaseMediaFile = async (bucket: string, objectPath: string) => {
  await supabaseStorageRequest(`/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefixes: [objectPath] }),
  });
};

const githubRequest = async <T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> => {
  const config = createGitHubContentStoreConfig();
  const { body, headers, ...rest } = init;
  const response = await fetch(`${config.apiBaseUrl}/repos/${config.repo}${path}`, {
    ...rest,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${config.token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      // Keep raw text.
    }
    throw new Error(`GitHub media request failed (${response.status} ${response.statusText})${message ? `: ${message}` : ""}`);
  }

  return response.json() as Promise<T>;
};

const commitGitHubMediaFile = async (relativePath: string, bytes: Buffer) => {
  const config = createGitHubContentStoreConfig();
  const refPath = `/git/ref/heads/${encodeRefPath(config.branch)}`;
  const updateRefPath = `/git/refs/heads/${encodeRefPath(config.branch)}`;
  const ref = await githubRequest<GitRefResponse>(refPath);
  const commit = await githubRequest<GitCommitResponse>(`/git/commits/${ref.object.sha}`);
  const blob = await githubRequest<GitCreateBlobResponse>("/git/blobs", {
    method: "POST",
    body: {
      content: bytes.toString("base64"),
      encoding: "base64",
    },
  });
  const tree = await githubRequest<GitCreateTreeResponse>("/git/trees", {
    method: "POST",
    body: {
      base_tree: commit.tree.sha,
      tree: [
        {
          path: joinGitPath(relativePath),
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        },
      ],
    },
  });
  const nextCommit = await githubRequest<GitCreateCommitResponse>("/git/commits", {
    method: "POST",
    body: {
      message: `Upload CMS media: ${relativePath}`,
      tree: tree.sha,
      parents: [commit.sha],
    },
  });

  await githubRequest(updateRefPath, {
    method: "PATCH",
    body: {
      sha: nextCommit.sha,
      force: false,
    },
  });
};

const writeLocalMediaFile = async (relativePath: string, bytes: Buffer) => {
  const absolutePath = resolve(process.cwd(), relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
};

export const saveUploadedMedia = async ({
  file,
  alt = "",
  folder = "",
  tags = "",
  scope,
}: {
  file: File;
  alt?: string;
  folder?: string;
  tags?: string;
  scope?: CmsWorkspaceScope;
}): Promise<AssetMeta> => {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Upload a PNG, JPEG, WebP, or GIF image.");
  }

  if (file.size > maxUploadBytes) {
    throw new Error("Image is too large. Keep uploads under 10MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = allowedImageTypes.get(file.type) ?? "jpg";
  const year = new Date().getUTCFullYear();
  const filename = `${slugifyFilePart(file.name)}-${randomUUID().slice(0, 8)}.${extension}`;
  const mediaStoreMode = readMediaStoreMode();
  const localOrGitHubPath = `public/uploads/${year}/${filename}`;
  const dimensions = getImageDimensions(bytes, file.type);
  const timestamp = new Date().toISOString();
  let url = `/uploads/${year}/${filename}`;
  let storagePath = localOrGitHubPath;
  let bucket: string | undefined;

  if (mediaStoreMode === "supabase") {
    const config = createSupabaseStorageConfig();
    storagePath = createSupabaseObjectPath(filename, scope);
    bucket = config.bucket;
    await uploadSupabaseMediaFile(config.bucket, storagePath, bytes, file.type);
    url = getSupabasePublicUrl(config.bucket, storagePath);
  } else if (mediaStoreMode === "github") {
    await commitGitHubMediaFile(localOrGitHubPath, bytes);
  } else {
    await writeLocalMediaFile(localOrGitHubPath, bytes);
  }

  return {
    id: `asset-${randomUUID()}`,
    url,
    filename,
    storageProvider: mediaStoreMode,
    storagePath,
    bucket,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    alt: alt.trim(),
    folder: folder.trim(),
    tags: parseTags(tags),
    ...dimensions,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const replaceUploadedMedia = async ({
  asset,
  file,
}: {
  asset: AssetMeta;
  file: File;
}): Promise<AssetMeta> => {
  const isSupabaseAsset = asset.storageProvider === "supabase";
  const isReplaceableAsset = asset.url.startsWith("/uploads/") || isSupabaseAsset;

  if (!isReplaceableAsset) {
    throw new Error("Only uploaded media can be replaced. External URLs should be updated manually.");
  }

  if (isSupabaseAsset && (!asset.storagePath || !asset.bucket)) {
    throw new Error("This Supabase asset is missing storage metadata and cannot be replaced safely.");
  }

  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Upload a PNG, JPEG, WebP, or GIF image.");
  }

  if (file.size > maxUploadBytes) {
    throw new Error("Image is too large. Keep uploads under 10MB.");
  }

  const nextExtension = allowedImageTypes.get(file.type) ?? "jpg";
  const currentExtension = getUrlExtension(asset.url);
  if (currentExtension && currentExtension !== nextExtension) {
    throw new Error(`Use another ${currentExtension.toUpperCase()} file to replace this image without changing the URL.`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dimensions = getImageDimensions(bytes, file.type);

  if (isSupabaseAsset) {
    await uploadSupabaseMediaFile(asset.bucket!, asset.storagePath!, bytes, file.type);
  } else if (readMediaStoreMode() === "github") {
    await commitGitHubMediaFile(`public${asset.url}`, bytes);
  } else {
    await writeLocalMediaFile(`public${asset.url}`, bytes);
  }

  return {
    ...asset,
    filename: asset.filename || basename(asset.url),
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    ...dimensions,
    updatedAt: new Date().toISOString(),
  };
};

export const deleteUploadedMedia = async (asset: AssetMeta) => {
  if (asset.storageProvider === "supabase") {
    if (!asset.storagePath || !asset.bucket) return;
    await deleteSupabaseMediaFile(asset.bucket, asset.storagePath);
    return;
  }

  const url = asset.url;
  if (!url.startsWith("/uploads/")) return;
  const relativePath = `public${url}`;

  if (asset.storageProvider === "github" || readMediaStoreMode() === "github") {
    return;
  }

  const absolutePath = resolve(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) return;
  await rm(absolutePath, { force: true });
};

export const removeLocalUploadedMediaFile = async (url: string) => {
  await deleteUploadedMedia({
    id: "",
    url,
    filename: basename(url),
    alt: "",
    storageProvider: "local",
  });
};
