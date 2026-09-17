import Link from "next/link";
import { getCmsActor, isCmsPlatformAdmin, listCmsWorkspaces } from "../../src/lib/cms/access";
import { isAuthConfigured } from "../../src/lib/cms/auth";
import { isSupabaseCmsAuthConfigured } from "../../src/lib/cms/supabaseAuth";
import { cmsWorkspaceHref } from "../../src/lib/cms/workspaceTypes";
import { packManifests } from "../../src/packs/registry";
import { starterDefinitions } from "../../src/starters/registry";
import { themePresets } from "../../src/themes/registry";
import type { CmsWorkspace } from "../../src/lib/cms/workspaceTypes";
import AddClientButton from "./AddClientButton";
import RetryDeploymentButton from "./RetryDeploymentButton";
import DeploymentStatusRefresher from "./DeploymentStatusRefresher";
import SetupHostingButton from "./SetupHostingButton";
import { reconcileWorkspaceDeployments } from "../../src/lib/cms/provisioning/reconcileDeployments";

const errorMessage = (error?: string) => {
  if (error === "invalid") return "The platform-admin password is incorrect.";
  if (error === "access") return "Sign-in failed, or this account has no BlockForge client access.";
  if (error === "locked") return "Too many incorrect attempts. Wait about 15 minutes before trying again.";
  if (error === "config") return "Configure Supabase Auth or the platform-admin password before logging in.";
  if (error === "session") return "Your session ended. Sign in again.";
  return "";
};

const formatDate = (value: string) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
  : "Not published";

const hasPublicWebsiteUrl = (siteUrl: string) => {
  try {
    const hostname = new URL(siteUrl).hostname;
    return hostname.includes(".")
      && hostname !== "localhost"
      && !hostname.endsWith(".local")
      && !/^\d+(?:\.\d+){3}$/.test(hostname);
  } catch {
    return false;
  }
};

const isExternallyHosted = (workspace: CmsWorkspace) =>
  workspace.deploymentStatus === "not_configured" && hasPublicWebsiteUrl(workspace.siteUrl);

const workspaceHealth = (workspace: CmsWorkspace) => {
  if (workspace.deploymentStatus === "failed") {
    return { label: "Needs attention", className: "border-rose-200 bg-rose-50 text-rose-700" };
  }
  if (workspace.deploymentStatus === "ready") {
    return { label: "Live", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  if (workspace.deploymentStatus === "deploying" || workspace.deploymentStatus === "provisioning") {
    return { label: "Deploying", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
  if (isExternallyHosted(workspace)) {
    return { label: "External", className: "border-sky-200 bg-sky-50 text-sky-700" };
  }
  return { label: "Setup needed", className: "border-slate-200 bg-slate-50 text-slate-600" };
};

const editableCustomDomain = (siteUrl: string) => {
  try {
    const hostname = new URL(siteUrl).hostname;
    return hostname.includes(".") && !hostname.endsWith(".vercel.app") && !/^\d+(?:\.\d+){3}$/.test(hostname)
      ? hostname
      : "";
  } catch {
    return "";
  }
};

export default async function CmsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const actor = await getCmsActor();

  if (actor) {
    const [listedWorkspaces, platformAdmin] = await Promise.all([
      listCmsWorkspaces(actor),
      isCmsPlatformAdmin(actor),
    ]);
    const workspaces = await reconcileWorkspaceDeployments(listedWorkspaces);
    const clientCount = new Set(workspaces.map((workspace) => workspace.tenantId)).size;
    const liveCount = workspaces.filter((workspace) => workspace.deploymentStatus === "ready" || isExternallyHosted(workspace)).length;
    const attentionCount = workspaces.filter((workspace) => workspace.deploymentStatus === "failed" || (workspace.deploymentStatus === "not_configured" && !isExternallyHosted(workspace))).length;

    return (
      <main className="min-h-screen bg-[#f6f7fb] text-[#172033]">
        <DeploymentStatusRefresher active={workspaces.some((workspace) => workspace.deploymentStatus === "deploying" || workspace.deploymentStatus === "provisioning")} />
        <header className="border-b border-[#e4e7ec] bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link href="/cms" className="flex items-center gap-3 font-bold tracking-[-0.03em]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#6d5dfc] text-lg text-white">B</span>
              <span>BlockForge</span>
            </Link>
            <form method="post" action="/api/cms/logout/">
              <button type="submit" className="rounded-lg border border-[#d9dee7] bg-white px-4 py-2 text-sm font-semibold text-[#344054] transition hover:border-[#6d5dfc] hover:text-[#6d5dfc]">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#6d5dfc]">Website management</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-[#101828]">Websites</h1>
              <p className="mt-2 text-sm text-[#667085]">Monitor every client website, then open one to manage its content, media, analytics, and settings.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#d9dee7] bg-white px-3 py-1.5 text-xs font-semibold text-[#667085]">
                {clientCount} client{clientCount === 1 ? "" : "s"}
              </span>
              {platformAdmin && (
                <AddClientButton
                  starters={starterDefinitions.map((starter) => ({ id: starter.id, label: starter.label, description: starter.description }))}
                  themes={themePresets.map((theme) => ({ id: theme.id, label: theme.label, description: theme.description }))}
                  packs={packManifests.map((pack) => ({ id: pack.id, label: pack.name, description: pack.description }))}
                />
              )}
            </div>
          </div>

          {workspaces.length > 0 ? (
            <>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm shadow-slate-900/5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#667085]">Websites</p><p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#101828]">{workspaces.length}</p></div>
                <div className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm shadow-slate-900/5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#667085]">Live</p><p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-emerald-600">{liveCount}</p></div>
                <div className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm shadow-slate-900/5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#667085]">Needs attention</p><p className={`mt-2 text-3xl font-bold tracking-[-0.04em] ${attentionCount ? "text-rose-600" : "text-[#101828]"}`}>{attentionCount}</p></div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm shadow-slate-900/5">
                <div className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(170px,.8fr)_minmax(220px,1fr)_auto] gap-5 border-b border-[#eef0f3] bg-[#fafbfc] px-7 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#667085] lg:grid">
                  <span>Website</span><span>Status</span><span>Activity</span><span>Access</span>
                </div>
                {workspaces.map((workspace) => {
                  const health = workspaceHealth(workspace);
                  const websiteUrl = workspace.deploymentUrl || workspace.siteUrl;
                  return (
                    <div
                      key={`${workspace.tenantId}:${workspace.siteId}`}
                      className="grid gap-4 border-b border-[#eef0f3] px-5 py-5 transition last:border-0 hover:bg-[#faf9ff] lg:grid-cols-[minmax(220px,1.3fr)_minmax(170px,.8fr)_minmax(220px,1fr)_auto] lg:items-center lg:gap-5 lg:px-7"
                    >
                      <span className="flex min-w-0 items-center gap-4">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f2efff] text-sm font-bold text-[#6d5dfc]">{workspace.tenantName.slice(0, 2).toUpperCase()}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-base font-bold text-[#101828]">{workspace.siteName}</span>
                          <span className="mt-0.5 block truncate text-sm text-[#667085]">{workspace.tenantName}</span>
                          <span className="mt-1 block truncate text-xs text-[#98a2b3]">{websiteUrl || "Domain not configured"}</span>
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${health.className}`}>{health.label}</span>
                        <span className="rounded-full border border-[#e4e7ec] bg-white px-2.5 py-1 text-xs font-semibold capitalize text-[#667085]">{workspace.developmentMode}</span>
                      </span>
                      <span className="text-sm text-[#667085]">
                        <span className="block">Published {formatDate(workspace.publishedAt)}</span>
                        <span className="mt-1 block text-xs">{workspace.pageCount} pages · {workspace.entryCount} entries · {workspace.assetCount} media</span>
                        {workspace.deploymentStatus === "failed" && workspace.deploymentError && <span className="mt-1 block truncate text-xs text-rose-600">{workspace.deploymentError}</span>}
                      </span>
                      <span className="flex items-center justify-between gap-4 lg:justify-end">
                        <span className="text-xs font-semibold capitalize text-[#667085]">{workspace.role.replace("_", " ")}</span>
                        {platformAdmin && workspace.deploymentStatus === "failed" && (
                          <RetryDeploymentButton tenantId={workspace.tenantId} siteId={workspace.siteId} initialDomain={editableCustomDomain(workspace.siteUrl)} />
                        )}
                        {platformAdmin && workspace.deploymentStatus === "not_configured" && !isExternallyHosted(workspace) && (
                          <SetupHostingButton tenantId={workspace.tenantId} siteId={workspace.siteId} />
                        )}
                        <Link href={cmsWorkspaceHref(workspace)} className="text-sm font-bold text-[#6d5dfc] transition hover:translate-x-0.5">Open →</Link>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-[#cfd4dc] bg-white p-10 text-center">
              <h2 className="font-bold text-[#101828]">No websites yet</h2>
              <p className="mt-2 text-sm text-[#667085]">Create the first website, or ask an owner to add this account to their workspace.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  const params = await searchParams;
  const message = errorMessage(params.error);
  const supabaseConfigured = isSupabaseCmsAuthConfigured();
  const legacyConfigured = isAuthConfigured();

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7fb] px-5 py-10 text-[#172033]">
      <section className="w-full max-w-md rounded-2xl border border-[#e4e7ec] bg-white p-7 shadow-xl shadow-slate-900/5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#6d5dfc] text-lg font-bold text-white">B</span>
        <p className="mt-6 text-sm font-semibold text-[#6d5dfc]">Admin access</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em]">BlockForge CMS</h1>
        <p className="mt-2 text-sm leading-6 text-[#667085]">Sign in to manage the clients assigned to your account.</p>
        {message && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>}
        <form method="post" action="/api/cms/login/" className="mt-6 space-y-4">
          {supabaseConfigured && (
            <label className="block text-sm font-semibold text-[#344054]">
              Email
              <input className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" type="email" name="email" autoComplete="email" autoFocus />
            </label>
          )}
          <label className="block text-sm font-semibold text-[#344054]">
            Password
            <input className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" type="password" name="password" autoComplete="current-password" required autoFocus={!supabaseConfigured} />
          </label>
          <button type="submit" className="h-11 w-full rounded-lg bg-[#6d5dfc] px-4 text-sm font-bold text-white transition hover:bg-[#5947e8]">Sign in</button>
        </form>
        {supabaseConfigured && (
          <Link href="/auth/forgot-password" className="mt-4 block text-center text-sm font-semibold text-[#6d5dfc] hover:text-[#5947e8]">
            Forgot password?
          </Link>
        )}
        {supabaseConfigured && legacyConfigured && (
          <p className="mt-4 text-xs leading-5 text-[#667085]">For the existing platform-admin login, leave email empty and enter the platform password.</p>
        )}
      </section>
    </main>
  );
}
