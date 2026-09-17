export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const publicStyles = {
  section:
    "w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-text)]",
  sectionCompact:
    "w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]",
  sectionSoft:
    "w-full min-w-0 overflow-hidden bg-[var(--site-surface-soft)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-text)]",
  sectionInverse:
    "w-full min-w-0 overflow-hidden bg-[var(--site-inverse)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-on-inverse)]",
  container: "mx-auto w-full max-w-[var(--site-container-width)]",
  eyebrow:
    "m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]",
  heading:
    "m-0 mt-4 max-w-[18ch] font-[var(--font-heading)] text-[length:var(--site-heading-size)] font-[var(--site-heading-weight)] leading-[var(--site-heading-leading)] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]",
  display:
    "m-0 font-[var(--font-heading)] text-[length:var(--site-display-size)] font-[var(--site-heading-weight)] leading-[0.94] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]",
  copy:
    "m-0 mt-5 max-w-[62ch] text-base leading-7 text-[var(--site-muted)] sm:text-lg sm:leading-8",
  card:
    "rounded-[var(--site-card-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] shadow-[var(--site-card-shadow)]",
  media:
    "overflow-hidden rounded-[var(--site-media-radius)] bg-[var(--site-surface-soft)] shadow-[var(--site-media-shadow)]",
  buttonPrimary:
    "inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] bg-[var(--site-primary)] px-5 py-3 text-sm font-extrabold text-[var(--site-on-primary)] no-underline transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--site-primary-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-primary)]",
  buttonSecondary:
    "inline-flex min-h-11 items-center justify-center rounded-[var(--site-button-radius)] border border-[var(--site-border)] bg-transparent px-5 py-3 text-sm font-extrabold text-[var(--site-text)] no-underline transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--site-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-primary)]",
  fieldLabel:
    "grid gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--site-text)]",
  field:
    "min-h-12 w-full rounded-[var(--site-radius-sm)] border border-[var(--site-border)] bg-[var(--site-background)] px-4 py-3 text-base font-normal normal-case tracking-normal text-[var(--site-text)] outline-none transition focus:border-[var(--site-primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--site-primary)_18%,transparent)]",
} as const;
