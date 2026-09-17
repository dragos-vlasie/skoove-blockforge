import { getPublishedContent } from "../../../../src/lib/cms/contentStore";
import { createPublicContentGraph, parsePublicWorkspaceScope } from "../../../../src/lib/cms/publicApi";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const scope = parsePublicWorkspaceScope(request.url);
    const graph = createPublicContentGraph(await getPublishedContent(scope));
    const etag = `"${Buffer.from(graph.updatedAt).toString("base64url")}"`;

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { etag } });
    }

    return Response.json(graph, {
      headers: {
        etag,
        "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load published content.";
    const status = message === "A valid tenant and site are required." ? 400 : 404;
    return Response.json({ ok: false, error: message }, { status });
  }
}
