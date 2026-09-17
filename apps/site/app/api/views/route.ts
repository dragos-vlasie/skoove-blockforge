const maxBodyBytes = 16_384;

export async function POST(request: Request) {
  const baseUrl = process.env.BLOCKFORGE_ANALYTICS_API_URL
    || process.env.BLOCKFORGE_CONTENT_API_URL
    || process.env.CMS_APP_URL
    || "";
  const tenantId = process.env.CMS_TENANT_ID || "";
  const siteId = process.env.CMS_SITE_ID || "";
  if (!baseUrl || !tenantId || !siteId) {
    return Response.json({ ok: false, error: "Client analytics is not configured." }, { status: 503 });
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
    return Response.json({ ok: false, error: "Analytics payload is too large." }, { status: 413 });
  }

  const url = new URL("/api/public/views/", baseUrl);
  url.searchParams.set("tenant", tenantId);
  url.searchParams.set("site", siteId);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") || "application/json",
        "user-agent": request.headers.get("user-agent") || "",
        ...(request.headers.get("x-vercel-ip-country")
          ? { "x-vercel-ip-country": request.headers.get("x-vercel-ip-country")! }
          : {}),
      },
      body,
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to forward analytics event.",
    }, { status: 502 });
  }
}
