import { createHmac, timingSafeEqual } from "node:crypto";

const PREVIEW_TOKEN_TTL_SECONDS = 5 * 60;

export type PreviewTokenClaims = {
  tenantId: string;
  siteId: string;
  parentOrigin: string;
  exp: number;
};

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");
const signature = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export const derivePreviewSecret = (
  masterSecret: string,
  tenantId: string,
  siteId: string,
) => {
  if (!masterSecret) return "";
  return createHmac("sha256", masterSecret)
    .update(`blockforge-preview:${tenantId}/${siteId}`)
    .digest("base64url");
};

export const createPreviewToken = (
  input: Omit<PreviewTokenClaims, "exp">,
  secret: string,
) => {
  if (!secret) throw new Error("Preview signing is not configured.");
  const claims: PreviewTokenClaims = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + PREVIEW_TOKEN_TTL_SECONDS,
  };
  const payload = encode(JSON.stringify(claims));
  return `${payload}.${signature(payload, secret)}`;
};

export const verifyPreviewToken = (
  token: string | undefined,
  secret: string,
): PreviewTokenClaims | null => {
  if (!token || !secret) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;

  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const claims = JSON.parse(decode(payload)) as PreviewTokenClaims;
    if (!claims.tenantId || !claims.siteId || !claims.parentOrigin) return null;
    if (!Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000) return null;
    return claims;
  } catch {
    return null;
  }
};
