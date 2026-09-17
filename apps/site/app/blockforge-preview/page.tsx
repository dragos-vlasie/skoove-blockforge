import type { Metadata } from "next";
import { LivePreviewClient } from "../../../../src/next/LivePreviewClient";
import { verifyPreviewToken } from "../../../../src/lib/preview/token";

export const metadata: Metadata = {
  title: "BlockForge live preview",
  robots: { index: false, follow: false },
};

export default async function BlockForgePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const claims = verifyPreviewToken(token, String(process.env.BLOCKFORGE_PREVIEW_SECRET || ""));
  const tenantId = String(process.env.CMS_TENANT_ID || "");
  const siteId = String(process.env.CMS_SITE_ID || "");
  const valid = claims && claims.tenantId === tenantId && claims.siteId === siteId;

  if (!valid) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center text-slate-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Preview unavailable</p>
          <h1 className="mt-3 text-2xl font-bold">This preview link is invalid or has expired.</h1>
          <p className="mt-2 text-sm text-slate-600">Return to BlockForge and refresh the editor.</p>
        </div>
      </main>
    );
  }

  return <LivePreviewClient parentOrigin={claims.parentOrigin} />;
}
