import { createHmac, timingSafeEqual } from "node:crypto";

export const CMS_SESSION_COOKIE = "bf_cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

const base64UrlEncode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const base64UrlDecode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const isDev = () => process.env.NODE_ENV !== "production";
const isProd = () => process.env.NODE_ENV === "production";
const LOCAL_CMS_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export const isLocalCmsRequest = (requestUrl: string | URL) => {
  if (!isDev()) return false;

  try {
    const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
    return LOCAL_CMS_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};

const getSessionSecret = () =>
  String(process.env.CMS_SESSION_SECRET || "") ||
  (isDev() ? "blockforge-dev-session-secret" : "");

const getAdminPassword = () =>
  String(process.env.CMS_ADMIN_PASSWORD || "") ||
  (isDev() ? "blockforge-dev" : "");

const sign = (payload: string) =>
  createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");

export const isAuthConfigured = () => Boolean(getSessionSecret() && getAdminPassword());

export const verifyAdminPassword = (password: string) => {
  const expected = getAdminPassword();
  if (!expected) return false;

  const passwordBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);

  if (passwordBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(passwordBuffer, expectedBuffer);
};

export const createSessionToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: "admin",
      iat: now,
      exp: now + SESSION_TTL_SECONDS,
    }),
  );

  return `${payload}.${sign(payload)}`;
};

export const verifySessionToken = (token?: string) => {
  if (!token || !isAuthConfigured()) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as { exp?: number; sub?: string };
    return parsed.sub === "admin" && typeof parsed.exp === "number" && parsed.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

export const getSessionCookieOptions = (requestUrl?: string) => ({
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: requestUrl ? new URL(requestUrl).protocol === "https:" : isProd(),
  maxAge: SESSION_TTL_SECONDS,
});

// --- Login attempt throttling -----------------------------------------
// A single shared admin password with no rate limiting is brute-forceable.
// This is a simple in-memory guard: it tracks failed attempts per client
// identifier (normally the caller's IP) and locks that identifier out for a
// while after too many failures in a short window. It resets on every
// successful login and self-prunes so the map can't grow without bound.
//
// Caveat: this state lives in the process memory of whichever server
// instance handles the request. On a platform that runs multiple instances
// or frequently recycles serverless functions, an attacker can get more
// attempts than this suggests. It is a meaningful speed bump, not a
// substitute for real account lockout backed by a shared store.

type LoginAttemptState = {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number | null;
};

const LOGIN_ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_ATTEMPTS_MAX_TRACKED = 5000; // hard cap so memory can't grow forever

const loginAttempts = new Map<string, LoginAttemptState>();

const pruneLoginAttempts = (now: number) => {
  if (loginAttempts.size <= LOGIN_ATTEMPTS_MAX_TRACKED) return;

  for (const [key, state] of loginAttempts) {
    const lockExpired = !state.lockedUntil || state.lockedUntil < now;
    const windowExpired = now - state.firstFailureAt > LOGIN_ATTEMPT_WINDOW_MS;
    if (lockExpired && windowExpired) loginAttempts.delete(key);
  }
};

export const getClientIdentifier = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();
  return firstForwarded || request.headers.get("x-real-ip") || "unknown";
};

export const getLoginLockRemainingMs = (key: string) => {
  const state = loginAttempts.get(key);
  if (!state?.lockedUntil) return 0;
  const remaining = state.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
};

export const isLoginLocked = (key: string) => getLoginLockRemainingMs(key) > 0;

export const registerLoginFailure = (key: string) => {
  const now = Date.now();
  pruneLoginAttempts(now);

  const existing = loginAttempts.get(key);
  const windowExpired = Boolean(existing) && now - (existing as LoginAttemptState).firstFailureAt > LOGIN_ATTEMPT_WINDOW_MS;

  const state: LoginAttemptState =
    !existing || windowExpired
      ? { failures: 1, firstFailureAt: now, lockedUntil: null }
      : { ...existing, failures: existing.failures + 1 };

  if (state.failures >= LOGIN_MAX_ATTEMPTS) {
    state.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }

  loginAttempts.set(key, state);
};

export const registerLoginSuccess = (key: string) => {
  loginAttempts.delete(key);
};
