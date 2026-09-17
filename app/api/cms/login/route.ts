import { NextResponse } from "next/server";
import {
  CMS_SESSION_COOKIE,
  createSessionToken,
  getClientIdentifier,
  getSessionCookieOptions,
  isAuthConfigured,
  isLoginLocked,
  registerLoginFailure,
  registerLoginSuccess,
  verifyAdminPassword,
} from "../../../../src/lib/cms/auth";
import { listCmsWorkspaces } from "../../../../src/lib/cms/access";
import {
  isSupabaseCmsAuthConfigured,
  signInCmsUser,
  signOutCmsUser,
} from "../../../../src/lib/cms/supabaseAuth";

export async function POST(request: Request) {
  if (!isAuthConfigured() && !isSupabaseCmsAuthConfigured()) {
    return Response.redirect(new URL("/cms?error=config", request.url), 303);
  }

  const clientId = getClientIdentifier(request);
  if (isLoginLocked(clientId)) return Response.redirect(new URL("/cms?error=locked", request.url), 303);

  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  let authenticated = false;

  if (email && isSupabaseCmsAuthConfigured()) {
    const result = await signInCmsUser(email, password);
    if (result.user) {
      const workspaces = await listCmsWorkspaces({
        kind: "supabase",
        id: result.user.id,
        email: result.user.email || email,
      });
      authenticated = workspaces.length > 0;
      if (!authenticated) await signOutCmsUser();
    }
  } else {
    authenticated = verifyAdminPassword(password);
  }

  if (!authenticated) {
    registerLoginFailure(clientId);
    return Response.redirect(new URL(`/cms?error=${email ? "access" : "invalid"}`, request.url), 303);
  }

  registerLoginSuccess(clientId);
  const response = NextResponse.redirect(new URL("/cms", request.url), 303);
  if (!email) {
    response.cookies.set(CMS_SESSION_COOKIE, createSessionToken(), getSessionCookieOptions(request.url));
  }
  return response;
}
