"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RetryResult = {
  deployment: {
    status: "deploying" | "ready" | "failed";
    productionUrl: string;
    adminUrl: string;
  };
  warnings: string[];
};

export default function RetryDeploymentButton({
  tenantId,
  siteId,
  initialDomain = "",
}: {
  tenantId: string;
  siteId: string;
  initialDomain?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RetryResult | null>(null);

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
      const response = await fetch(`/api/cms/clients/${encodeURIComponent(tenantId)}/retry/`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          siteId,
          domain: String(form.get("domain") || ""),
        }),
      });
      const payload = await response.json() as { error?: string; result?: RetryResult };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Unable to retry deployment.");
      setResult(payload.result);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to retry deployment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
      >
        Fix &amp; retry
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby={`retry-${tenantId}-title`}>
            <header className="flex items-start justify-between gap-4 border-b border-[#e4e7ec] px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6d5dfc]">Deployment recovery</p>
                <h2 id={`retry-${tenantId}-title`} className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#101828]">Fix and retry {tenantId}</h2>
                <p className="mt-2 text-sm leading-6 text-[#667085]">The existing workspace, content, owner and media remain unchanged.</p>
              </div>
              <button type="button" onClick={close} disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#d9dee7] text-xl text-[#667085] transition hover:bg-slate-50 disabled:opacity-50" aria-label="Close">×</button>
            </header>

            {result ? (
              <div className="p-5 sm:p-7">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                  <p className="font-bold">Deployment restarted successfully</p>
                  <p className="mt-2 break-all">{result.deployment.productionUrl || "The Vercel URL will appear when deployment is ready."}</p>
                  {result.warnings.map((warning) => <p key={warning} className="mt-2 text-amber-800">{warning}</p>)}
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  {result.deployment.adminUrl && <a href={result.deployment.adminUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-xl border border-[#d9dee7] px-5 text-sm font-bold text-[#344054] transition hover:bg-slate-50">Open Vercel</a>}
                  <button type="button" onClick={close} className="h-11 rounded-xl bg-[#6d5dfc] px-5 text-sm font-bold text-white transition hover:bg-[#5947e8]">Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="p-5 sm:p-7">
                <label className="block text-sm font-semibold text-[#344054]">Correct custom domain <span className="font-normal text-[#98a2b3]">(optional)</span><input name="domain" defaultValue={initialDomain} className="mt-1.5 h-11 w-full rounded-lg border border-[#d9dee7] px-3 outline-none transition focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20" placeholder="Leave blank to use the Vercel URL" /><span className="mt-1.5 block text-xs font-normal leading-5 text-[#667085]">Use a real hostname such as example.com, or leave this blank.</span></label>

                {error && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</div>}

                <footer className="mt-7 flex justify-end gap-3 border-t border-[#eef0f3] pt-5">
                  <button type="button" onClick={close} disabled={busy} className="h-11 rounded-xl border border-[#d9dee7] px-5 text-sm font-bold text-[#344054] transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={busy} className="h-11 rounded-xl bg-[#6d5dfc] px-5 text-sm font-bold text-white transition hover:bg-[#5947e8] disabled:cursor-wait disabled:opacity-60">{busy ? "Retrying…" : "Retry deployment"}</button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
