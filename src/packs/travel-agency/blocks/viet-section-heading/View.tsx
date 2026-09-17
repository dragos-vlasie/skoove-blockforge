import { PreviewField } from "../../../../cms/fieldHighlight";

export interface VietSectionHeadingContent {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: "left" | "center";
  headingLevel?: "h1" | "h2";
}

export function VietSectionHeadingView({ content }: { content: VietSectionHeadingContent }) {
  const centered = content.align === "center";
  const Heading = content.headingLevel === "h1" ? "h1" : "h2";

  return (
    <header
      className={`w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)] ${centered ? "text-center" : ""}`}
    >
      <div className={`mx-auto w-full max-w-[var(--site-container-width)] ${centered ? "flex flex-col items-center" : ""}`}>
        {content.eyebrow && <PreviewField as="p" path="eyebrow" className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-primary)]">{content.eyebrow}</PreviewField>}
        <PreviewField as={Heading} path={["title", "headingLevel", "align"]} className="mt-3 max-w-4xl font-[var(--font-heading)] text-[clamp(2rem,4vw,4rem)] font-[var(--site-heading-weight)] leading-[var(--site-heading-line-height)] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{content.title}</PreviewField>
        {content.body && <PreviewField as="p" path="body" className="mt-5 max-w-2xl text-lg leading-8 text-[var(--site-muted)]">{content.body}</PreviewField>}
      </div>
    </header>
  );
}
