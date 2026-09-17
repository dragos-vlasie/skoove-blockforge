import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { CMS_SESSION_COOKIE, isLocalCmsRequest, verifySessionToken } from "./src/lib/cms/auth";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const normalizedPath = path.replace(/\/+$/, "");
  if (!path.startsWith("/api/cms/") || normalizedPath === "/api/cms/login" || normalizedPath === "/api/cms/logout") return NextResponse.next();
  const incomingUrl = new URL(request.nextUrl);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (host) incomingUrl.host = host;
  if (isLocalCmsRequest(incomingUrl) || verifySessionToken(request.cookies.get(CMS_SESSION_COOKIE)?.value)) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.CMS_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.CMS_SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.CMS_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    let response = NextResponse.next({ request });
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    if (data.user) return response;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = { matcher: ["/api/cms/:path*"] };
