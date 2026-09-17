import { PreviewField } from "../../../../cms/fieldHighlight";

export interface VietEnquiryTourOption { value: string; label: string; }
export interface VietTourEnquiryContent {
  sectionId?: string;
  collectionId?: string;
  eyebrow?: string; title: string; body?: string; submitLabel?: string; action?: string;
  formName?: string;
  phoneLabel?: string; phoneHref?: string; privacyLabel?: string; nameLabel?: string;
  phoneFieldLabel?: string; tourLabel?: string; tourPlaceholder?: string; monthLabel?: string;
  guestsLabel?: string; notesLabel?: string; tourOptions?: VietEnquiryTourOption[];
}

export function VietTourEnquiryView({ content, preview = false, currentTourId = "", currentTourTitle = "" }: {
  content: VietTourEnquiryContent;
  preview?: boolean;
  currentTourId?: string;
  currentTourTitle?: string;
}) {
  const formName = content.formName || "travel-agency-enquiry";

  return (
    <section id={content.sectionId || "travel-enquiry"} className="w-full min-w-0 overflow-hidden bg-[var(--site-inverse)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-on-inverse)]">
      <div className="mx-auto grid w-full max-w-[var(--site-container-width)] gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          {content.eyebrow && <PreviewField as="p" path="eyebrow" className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-accent)]">{content.eyebrow}</PreviewField>}
          <PreviewField as="h2" path="title" className="mt-3 font-[var(--font-heading)] text-[clamp(2rem,4vw,4rem)] font-[var(--site-heading-weight)] leading-[var(--site-heading-line-height)] tracking-[var(--site-heading-tracking)] text-[var(--site-on-inverse)]">{content.title}</PreviewField>
          {content.body && <PreviewField as="p" path="body" className="mt-5 text-lg leading-8 text-[color-mix(in_srgb,var(--site-on-inverse)_75%,transparent)]">{content.body}</PreviewField>}
          {content.phoneLabel && <PreviewField as="a" path={["phoneLabel", "phoneHref"]} className="mt-8 inline-block border-b border-[color:var(--site-accent)] pb-1 font-black text-[var(--site-on-inverse)]" href={content.phoneHref || "#"}>{content.phoneLabel}</PreviewField>}
        </div>
        <form
          className="rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-6 text-[var(--site-text)] shadow-[var(--site-card-shadow)] sm:p-8"
          method="post"
          action={preview ? undefined : content.action || "/cam-on/"}
          data-netlify={preview ? undefined : "true"}
          data-netlify-honeypot={preview ? undefined : "bot-field"}
          name={formName}
        >
          <input type="hidden" name="form-name" value={formName} />
          <input type="hidden" name="tourPageId" value={currentTourId} />
          <input type="hidden" name="tourPageTitle" value={currentTourTitle} />
          <p hidden>
            <label>
              Leave this field empty:
              <input name="bot-field" tabIndex={-1} autoComplete="off" />
            </label>
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <PreviewField as="label" path="nameLabel" className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--site-heading)]">
              {content.nameLabel || "Full name"}
              <input className="min-h-12 w-full rounded-[var(--site-input-radius)] border border-[var(--site-border)] bg-[var(--site-background)] px-4 py-3 font-normal normal-case tracking-normal text-[var(--site-text)] outline-none focus:border-[var(--site-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--site-primary)_20%,transparent)]" type="text" name="fullName" autoComplete="name" required />
            </PreviewField>
            <PreviewField as="label" path="phoneFieldLabel" className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--site-heading)]">
              {content.phoneFieldLabel || "Phone number"}
              <input className="min-h-12 w-full rounded-[var(--site-input-radius)] border border-[var(--site-border)] bg-[var(--site-background)] px-4 py-3 font-normal normal-case tracking-normal text-[var(--site-text)] outline-none focus:border-[var(--site-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--site-primary)_20%,transparent)]" type="tel" name="phone" autoComplete="tel" required />
            </PreviewField>
            <PreviewField as="label" path={["tourLabel", "tourPlaceholder"]} className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--site-heading)] sm:col-span-2">
              {content.tourLabel || "Tour of interest"}
              <select className="min-h-12 w-full rounded-[var(--site-input-radius)] border border-[var(--site-border)] bg-[var(--site-background)] px-4 py-3 font-normal normal-case tracking-normal text-[var(--site-text)] outline-none focus:border-[var(--site-primary)]" name="tour" defaultValue={currentTourId}>
                <option value="">{content.tourPlaceholder || "Choose a journey"}</option>
                {(content.tourOptions || []).map((tour) => <option value={tour.value} key={tour.value}>{tour.label}</option>)}
              </select>
            </PreviewField>
            <PreviewField as="label" path="monthLabel" className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--site-heading)]">
              {content.monthLabel || "Preferred month"}
              <input className="min-h-12 w-full rounded-[var(--site-input-radius)] border border-[var(--site-border)] bg-[var(--site-background)] px-4 py-3 font-normal normal-case tracking-normal text-[var(--site-text)]" type="month" name="departureMonth" />
            </PreviewField>
            <PreviewField as="label" path="guestsLabel" className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--site-heading)]">
              {content.guestsLabel || "Number of travellers"}
              <input className="min-h-12 w-full rounded-[var(--site-input-radius)] border border-[var(--site-border)] bg-[var(--site-background)] px-4 py-3 font-normal normal-case tracking-normal text-[var(--site-text)]" type="number" min="1" name="guestCount" />
            </PreviewField>
            <PreviewField as="label" path="notesLabel" className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--site-heading)] sm:col-span-2">
              {content.notesLabel || "Notes"}
              <textarea className="min-h-28 w-full resize-y rounded-[var(--site-input-radius)] border border-[var(--site-border)] bg-[var(--site-background)] px-4 py-3 font-normal normal-case tracking-normal text-[var(--site-text)]" name="notes" />
            </PreviewField>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            {content.privacyLabel && <PreviewField as="small" path="privacyLabel" className="max-w-md leading-5 text-[var(--site-muted)]">{content.privacyLabel}</PreviewField>}
            <PreviewField as="button" path={["submitLabel", "action"]} className="inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] bg-[var(--site-primary)] px-5 py-3 font-extrabold text-[var(--site-on-primary)]" type={preview ? "button" : "submit"}>{content.submitLabel || "Send enquiry"}</PreviewField>
          </div>
        </form>
      </div>
    </section>
  );
}
