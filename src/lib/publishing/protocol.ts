import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { CmsWorkspaceScope } from "../cms/workspaceTypes";

export type PublicationNotice = CmsWorkspaceScope & { releaseId: string };
export class PublicationError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}
const hmac = (key: string, message: string) => createHmac("sha256", key).update(message).digest("base64url");
export const publishedCacheTag = (scope: CmsWorkspaceScope) =>
  `blox-published-${createHash("sha256").update(JSON.stringify([scope.tenantId, scope.siteId])).digest("hex")}`;
export const derivePublicationSecret = (master: string, scope: CmsWorkspaceScope) =>
  master ? hmac(master, JSON.stringify(["blox-publication-v1", scope.tenantId, scope.siteId])) : "";
export function publicationHeaders(secret: string, body: string, now = Date.now()) {
  if (!secret) throw new PublicationError("Website refresh is not configured.", 503);
  const timestamp = String(now);
  return { "content-type": "application/json", "x-blox-publish-time": timestamp,
    "x-blox-publish-signature": hmac(secret, JSON.stringify([timestamp, body])) };
}
export async function verifyPublicationRequest(request: Request, env: Record<string, string | undefined>, now = Date.now()): Promise<PublicationNotice> {
  const secret = env.BLOCKFORGE_REVALIDATION_SECRET || "";
  if (!secret || !env.CMS_TENANT_ID || !env.CMS_SITE_ID) throw new PublicationError("Website refresh is not configured.", 503);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PublicationError("JSON is required.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new PublicationError("Missing publication notice.");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new PublicationError("Publication notice is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = Buffer.concat(chunks).toString("utf8");
  const timestamp = request.headers.get("x-blox-publish-time") || "";
  if (!/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000) throw new PublicationError("Expired publication notice.", 401);
  const expected = Buffer.from(publicationHeaders(secret, body, Number(timestamp))["x-blox-publish-signature"]);
  const supplied = Buffer.from(request.headers.get("x-blox-publish-signature") || "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new PublicationError("Invalid publication signature.", 401);
  let notice: PublicationNotice;
  try { notice = JSON.parse(body); } catch { throw new PublicationError("Invalid publication notice."); }
  if (!notice || notice.tenantId !== env.CMS_TENANT_ID || notice.siteId !== env.CMS_SITE_ID) throw new PublicationError("Publication belongs to another website.", 403);
  if (typeof notice.releaseId !== "string" || !/^[A-Za-z0-9_-]{1,512}$/.test(notice.releaseId)) throw new PublicationError("Invalid published release.");
  return notice;
}
