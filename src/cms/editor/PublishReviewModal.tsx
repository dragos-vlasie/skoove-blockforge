import type { ValidationIssue } from "../../../types";
import { CmsDialog } from "../primitives/CmsDialog";

export type PublishIssueTarget = {
  label: string;
  meta: string;
};

export function PublishReviewModal({
  open,
  issues,
  getTarget,
  onFix,
  onClose,
  onPublish,
}: {
  open: boolean;
  issues: ValidationIssue[];
  getTarget: (issue: ValidationIssue) => PublishIssueTarget;
  onFix: (issue: ValidationIssue) => void;
  onClose: () => void;
  onPublish: () => void;
}) {
  if (!open) return null;
  const hasBlockers = issues.length > 0;

  return (
    <CmsDialog
      open={open}
      onClose={onClose}
      eyebrow="Publishing"
      title={hasBlockers ? "Fix blocking errors first" : "Publish site changes?"}
      description={hasBlockers
        ? "Review every publish blocker, then jump to the exact content and panel."
        : "This publishes the complete saved content graph, including pages, navigation, entries, and reusable sections."}
      maxWidthClassName="sm:max-w-3xl"
      footer={(
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#d9dee7] bg-white px-4 text-sm font-medium text-[#475467]">
            Cancel
          </button>
          {!hasBlockers && (
            <button type="button" onClick={onPublish} className="h-10 rounded-lg bg-[#6d5dfc] px-4 text-sm font-medium text-white hover:bg-[#5947e8]">
              Publish all
            </button>
          )}
        </div>
      )}
    >
          {hasBlockers ? <div className="grid gap-3">
            {issues.map((issue) => {
              const target = getTarget(issue);

              return (
                <div key={issue.id} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">{issue.scope}</p>
                      <h4 className="mt-1 truncate text-sm font-black uppercase tracking-widest text-slate-950">{target.label}</h4>
                      <p className="mt-1 truncate text-xs font-bold text-slate-500">{target.meta}</p>
                      <p className="mt-3 text-sm font-bold leading-snug text-rose-700">{issue.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFix(issue)}
                      className="rounded-xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      Fix
                    </button>
                  </div>
                </div>
              );
            })}
          </div> : (
            <div className="rounded-xl border border-[#dfe3e8] bg-[#f8fafc] p-4 text-sm leading-6 text-[#475467]">
              Visitors will continue to see the previous version until publishing completes. A configured deployment hook will then rebuild the public website.
            </div>
          )}
    </CmsDialog>
  );
}
