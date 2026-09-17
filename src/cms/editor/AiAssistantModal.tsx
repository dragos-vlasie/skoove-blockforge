import { CmsDialog } from "../primitives/CmsDialog";
import { Field } from "../ui";

export function AiAssistantModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <CmsDialog
      open={open}
      onClose={onClose}
      eyebrow="Gemini Intelligence"
      title="AI content assistant"
      description="Refine copy, generate variations, or structure new content."
      tone="inverse"
      maxWidthClassName="sm:max-w-xl"
      footer={(
        <button
          type="button"
          className="min-h-11 w-full rounded-xl bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-violet-700 shadow-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
        >
          Magic Generate
        </button>
      )}
    >
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm font-bold leading-relaxed text-violet-100">
          Refine copy, generate variations, or structure new nodes...
      </div>
      <div className="mt-4">
        <Field label="Instructions" labelClassName="text-violet-100">
        <textarea
          autoFocus
          rows={5}
          className="w-full rounded-xl border border-white/20 bg-white/10 p-4 text-sm font-bold text-white outline-none placeholder:text-violet-200 focus:ring-4 focus:ring-white/20"
          placeholder="Tell Gemini what to improve..."
        />
        </Field>
      </div>
    </CmsDialog>
  );
}
