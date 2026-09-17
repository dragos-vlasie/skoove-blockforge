import type { FormEvent } from "react";
import { CmsDialog } from "../primitives/CmsDialog";
import { Field, TextInput } from "../ui";

export type SharedBlockDraft = {
  blockId: string;
  blockLabel: string;
  name: string;
};

export function SharedBlockDialog({
  draft,
  onChangeDraft,
  onSubmit,
  onClose,
}: {
  draft: SharedBlockDraft | null;
  onChangeDraft: (draft: SharedBlockDraft | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  if (!draft) return null;

  return (
    <CmsDialog
      open
      onClose={onClose}
      eyebrow="Reusable section"
      title="Save as shared block"
      description={`This ${draft.blockLabel.toLowerCase()} becomes one reusable source.`}
      maxWidthClassName="sm:max-w-md"
      formProps={{ onSubmit }}
      footer={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!draft.name.trim()}
            className="min-h-11 rounded-xl bg-violet-600 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save Shared
          </button>
        </div>
      )}
    >
      <Field label="Shared block name">
        <TextInput
          autoFocus
          value={draft.name}
          onChange={(event) => onChangeDraft({ ...draft, name: event.target.value })}
          placeholder="Header CTA"
        />
      </Field>
      <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-medium leading-relaxed text-violet-900">
        Editing this shared block later will update every page where it is inserted.
      </div>
    </CmsDialog>
  );
}
