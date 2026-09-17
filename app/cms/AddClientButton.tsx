"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; label: string; description?: string };
type ProvisioningResult = {
  workspaceUrl: string;
  ownerEmail: string;
  ownerInvited: boolean;
  developerEmail?: string;
  developerInvited?: boolean;
  developmentMode: "managed" | "code";
  mediaPrefix: string;
  deployment: {
    status: "deploying" | "ready" | "failed";
    productionUrl: string;
    adminUrl: string;
    customDomain?: string;
    customDomainVerified?: boolean;
  };
  warnings: string[];
};

export default function AddClientButton({
  starters,
  themes,
  packs,
}: {
  starters: Option[];
  themes: Option[];
  packs: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProvisioningResult | null>(null);
  const [enabledPacks, setEnabledPacks] = useState<string[]>(["core"]);
  const [developmentMode, setDevelopmentMode] = useState<"managed" | "code">("managed");

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError("");
    setResult(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    const form = new FormData(event.currentTarget);

    try {
      const manifestText = String(form.get("clientExtensionManifest") || "").trim();
      const response = await fetch("/api/cms/clients/", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          companyName: String(form.get("companyName") || ""),
          domain: String(form.get("domain") || ""),
          starterId: String(form.get("starterId") || ""),
          themeId: String(form.get("themeId") || ""),
          ownerEmail: String(form.get("ownerEmail") || ""),
          developerEmail: String(form.get("developerEmail") || ""),
          developmentMode,
          repository: String(form.get("repository") || ""),
          repositoryBranch: developmentMode === "code" ? String(form.get("repositoryBranch") || "main") : "",
          repositoryRootDirectory: developmentMode === "code" ? String(form.get("repositoryRootDirectory") || "") : "",
          clientExtensionManifest: manifestText ? JSON.parse(manifestText) : undefined,
          deploymentProjectId: String(form.get("deploymentProjectId") || ""),
          enabledPacks,
        }),
      });
      const payload = await response.json() as { error?: string; result?: ProvisioningResult };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Unable to provision the client.");
      setResult(payload.result);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to provision the client.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#6d5dfc] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#5947e8] focus:outline-none focus:ring-2 focus:ring-[#6d5dfc]/30 focus:ring-offset-2"
      >
        New website
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="my-6 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="add-client-title">
            <header className="flex items-start justify-between gap-4 border-b border-[#e4e7ec] px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6d5dfc]">Website onboarding</p>
                <h2 id="add-client-title" className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#101828]">Create a client website</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">Creates the client-owned workspace, team access, starter content, media area, hosting project, and first deployment.</p>
              </div>
              <button type="button" onClick={close} disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#d9dee7] text-xl text-[#667085] transition hover:bg-slate-50 disabled:opacity-50" aria-label="Close">×</button>
            </header>

            {result ? (
              <div className="p-5 sm:p-7">
                <div className={`rounded-xl border p-5 ${result.deployment.status === "failed" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <p className={`text-sm font-bold ${result.deployment.status === "failed" ? "text-amber-900" : "text-emerald-900"}`}>
                    {result.deployment.status === "failed" ? "Website created; deployment needs attention" : "Website provisioned successfully"}
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="font-semibold text-slate-600">Owner</dt><dd className="mt-1 text-slate-950">{result.ownerEmail} · {result.ownerInvited ? "invite sent" : "existing account connected"}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Development</dt><dd className="mt-1 capitalize text-slate-950">{result.developmentMode} mode</dd></div>
                    {result.developerEmail && <div><dt className="font-semibold text-slate-600">Developer</dt><dd className="mt-1 text-slate-950">{result.developerEmail} · {result.developerInvited ? "invite sent" : "existing account connected"}</dd></div>}
                    <div><dt className="font-semibold text-slate-600">Media</dt><dd className="mt-1 break-all text-slate-950">{result.mediaPrefix}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Deployment</dt><dd className="mt-1 capitalize text-slate-950">{result.deployment.status}</dd></div>
                    <div><dt className="font-semibold text-slate-600">Website</dt><dd className="mt-1 break-all text-slate-950">{result.deployment.productionUrl || "Available after deployment"}</dd></div>
                  </dl>
                  {result.warnings.length > 0 && (
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-800">
                      {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={close} className="h-11 rounded-xl border border-[#d9dee7] px-5 text-sm font-bold text-[#344054] transition hover:bg-slate-50">Close</button>
                  {result.deployment.adminUrl && <a href={result.deployment.adminUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-xl border border-[#d9dee7] px-5 text-sm font-bold text-[#344054] transition hover:bg-slate-50">Open Vercel</a>}
                  <a href={result.workspaceUrl} className="inline-flex h-11 items-center rounded-xl bg-[#6d5dfc] px-5 text-sm font-bold text-white transition hover:bg-[#5947e8]">Open workspace</a>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="p-5 sm:p-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-[#344054]">Client/company name<input name="companyName" required autoFocus className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder="Acme Ltd" /></label>
                  <label className="text-sm font-semibold text-[#344054]">Custom domain <span className="font-normal text-[#98a2b3]">(optional)</span><input name="domain" className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder="acme.co.uk" /><span className="mt-1.5 block text-xs font-normal leading-5 text-[#667085]">Leave blank to launch with the Vercel URL and connect a domain later.</span></label>
                  <label className="text-sm font-semibold text-[#344054]">Owner email<input name="ownerEmail" type="email" required className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder="owner@acme.co.uk" /></label>
                  <label className="text-sm font-semibold text-[#344054]">Developer email <span className="font-normal text-[#98a2b3]">(optional)</span><input name="developerEmail" type="email" className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder="developer@acme.co.uk" /></label>
                  <label className="text-sm font-semibold text-[#344054]">Starter<select name="starterId" defaultValue={starters[0]?.id} className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] bg-white px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20">{starters.map((starter) => <option key={starter.id} value={starter.id}>{starter.label}</option>)}</select></label>
                  <label className="text-sm font-semibold text-[#344054]">Theme<select name="themeId" defaultValue={themes.find((theme) => theme.id === "clean-saas")?.id || themes[0]?.id} className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] bg-white px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20">{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}</select></label>
                </div>

                <fieldset className="mt-6">
                  <legend className="text-sm font-bold text-[#344054]">Development mode</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {([
                      { id: "managed", label: "Managed", description: "Uses the shared BlockForge codebase. Best for most websites." },
                      { id: "code", label: "Code", description: "Uses a dedicated GitHub repository for custom React and integrations." },
                    ] as const).map((mode) => (
                      <label key={mode.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${developmentMode === mode.id ? "border-violet-200 bg-violet-50" : "border-[#e4e7ec] hover:border-slate-300"}`}>
                        <input type="radio" name="developmentMode" value={mode.id} checked={developmentMode === mode.id} onChange={() => setDevelopmentMode(mode.id)} className="mt-0.5 h-4 w-4 border-slate-300 text-[#6d5dfc] focus:ring-[#6d5dfc]" />
                        <span><span className="block text-sm font-bold text-[#101828]">{mode.label}</span><span className="mt-1 block text-xs leading-5 text-[#667085]">{mode.description}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {developmentMode === "code" && (
                  <div className="mt-5 grid gap-5 rounded-xl border border-[#e4e7ec] bg-slate-50 p-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-[#344054]">GitHub repository<input name="repository" className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] bg-white px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder="owner/repository" /></label>
                    <label className="text-sm font-semibold text-[#344054]">Branch<input name="repositoryBranch" defaultValue="main" className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] bg-white px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" /></label>
                    <label className="text-sm font-semibold text-[#344054] sm:col-span-2">Vercel root directory <span className="font-normal text-[#98a2b3]">(optional)</span><input name="repositoryRootDirectory" className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] bg-white px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder="apps/site for a BlockForge-based repository" /></label>
                    <label className="text-sm font-semibold text-[#344054] sm:col-span-2">Client extension manifest <span className="font-normal text-[#98a2b3]">(optional)</span><textarea name="clientExtensionManifest" rows={7} className="mt-1.5 w-full rounded-lg border border-[#d9dee7] bg-white px-3 py-2 font-mono text-xs outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder={'{\n  "schemaVersion": 1,\n  "id": "acme",\n  "name": "Acme components",\n  "version": "1.0.0",\n  "blocks": [{ "type": "CUSTOM:FEATURE", "label": "Feature", "viewModule": "src/client-extensions/Feature", "defaultContent": {}, "fields": [] }]\n}'} /></label>
                    <p className="text-xs leading-5 text-[#667085] sm:col-span-2">Provide a dedicated repository, or connect an existing Vercel project. The optional manifest exposes that repository’s approved custom components and editable fields in the CMS.</p>
                  </div>
                )}

                <details className="mt-5 rounded-xl border border-[#e4e7ec] bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-[#344054]">Import an existing Vercel project</summary>
                  <label className="mt-4 block text-sm font-semibold text-[#344054]">Existing Vercel Project ID or name <span className="font-normal text-[#98a2b3]">(optional)</span><input name="deploymentProjectId" className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] bg-white px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder="Leave empty to create a new project" /></label>
                  <p className="mt-2 text-xs leading-5 text-[#667085]">Use this only when the website is already deployed in your Vercel account. For a new client, leave it empty.</p>
                </details>

                <fieldset className="mt-6">
                  <legend className="text-sm font-bold text-[#344054]">Enabled packs</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {packs.map((pack) => {
                      const core = pack.id === "core";
                      const checked = core || enabledPacks.includes(pack.id);
                      return (
                        <label key={pack.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${checked ? "border-violet-200 bg-violet-50" : "border-[#e4e7ec] hover:border-slate-300"}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={core}
                            onChange={(event) => setEnabledPacks((current) => event.target.checked ? [...new Set([...current, pack.id])] : current.filter((id) => id !== pack.id))}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#6d5dfc] focus:ring-[#6d5dfc]"
                          />
                          <span><span className="block text-sm font-bold text-[#101828]">{pack.label}</span>{pack.description && <span className="mt-1 block text-xs leading-5 text-[#667085]">{pack.description}</span>}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {error && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</div>}

                <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f3] pt-5">
                  <p className="max-w-md text-xs leading-5 text-[#667085]">The client becomes owner. You retain platform management access, and an optional developer receives developer-level access.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={close} disabled={busy} className="h-11 rounded-xl border border-[#d9dee7] px-5 text-sm font-bold text-[#344054] transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={busy} className="h-11 rounded-xl bg-[#6d5dfc] px-5 text-sm font-bold text-white transition hover:bg-[#5947e8] disabled:cursor-wait disabled:opacity-60">{busy ? "Provisioning…" : "Create website"}</button>
                  </div>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
