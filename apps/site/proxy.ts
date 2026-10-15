import { NextRequest, NextResponse } from "next/server";
import { isNonCanonicalVercelHost } from "../../src/lib/cms/seo";

export function proxy(request: NextRequest) {
  // Host-specific indexing rules must not force otherwise static pages to read
  // request headers. This still runs when Vercel serves a cached ISR response.
  const siteUrl = process.env.BLOCKFORGE_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://unconfigured.invalid");
  const noindex = process.env.VERCEL_ENV === "preview"
    || ["deploy-preview", "branch-deploy"].includes(process.env.CONTEXT || "")
    || isNonCanonicalVercelHost(request.headers.get("host"), siteUrl);
  if (noindex && request.nextUrl.pathname === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      headers: { "content-type": "text/plain", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" },
    });
  }
  const response = NextResponse.next();
  if (noindex) response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/((?!api/|_next/|favicon.ico).*)"] };
