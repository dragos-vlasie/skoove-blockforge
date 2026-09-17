import type { AnalyticsEventInput } from "../../../../src/lib/cms/viewAnalytics";
import { recordAnalyticsEvent } from "../../../../src/lib/cms/viewAnalytics";
import { getPublishedContent } from "../../../../src/lib/cms/contentStore";
import { parsePublicWorkspaceScope } from "../../../../src/lib/cms/publicApi";

const maxBodyBytes = 16_384;

export async function POST(request: Request) {
  try {
    const scope = parsePublicWorkspaceScope(request.url);
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > maxBodyBytes) {
      return Response.json({ ok: false, error: "Analytics payload is too large." }, { status: 413 });
    }

    await getPublishedContent(scope);
    const body = (bodyText ? JSON.parse(bodyText) : {}) as Record<string, unknown>;
    await recordAnalyticsEvent({
      eventType: body.eventType === "click" || body.event_type === "click" ? "click" : "page_view",
      path: typeof body.path === "string" ? body.path : "/",
      title: typeof body.title === "string" ? body.title : undefined,
      target: typeof body.target === "string" ? body.target : typeof body.target_element === "string" ? body.target_element : undefined,
      referrer: typeof body.referrer === "string" ? body.referrer : undefined,
      userAgent: request.headers.get("user-agent") || "",
      sessionId: typeof body.sessionId === "string" ? body.sessionId : typeof body.session_id === "string" ? body.session_id : undefined,
      visitorId: typeof body.visitorId === "string" ? body.visitorId : typeof body.visitor_id === "string" ? body.visitor_id : undefined,
      country: request.headers.get("x-vercel-ip-country") || request.headers.get("x-country") || request.headers.get("x-nf-country") || "",
    } satisfies AnalyticsEventInput, {
      ...process.env,
      CMS_TENANT_ID: scope.tenantId,
      CMS_SITE_ID: scope.siteId,
    });

    return Response.json({ ok: true }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record analytics event.";
    const status = error instanceof SyntaxError || message === "A valid tenant and site are required." ? 400 : 404;
    return Response.json({ ok: false, error: message }, { status });
  }
}
