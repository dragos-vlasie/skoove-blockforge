import { PreviewField } from "../../../../cms/fieldHighlight";

export interface VietTrustItem {
  value?: string;
  title: string;
  description?: string;
}

export interface VietTrustStripContent {
  items?: VietTrustItem[];
}

export function VietTrustStripView({ content }: { content: VietTrustStripContent }) {
  return (
    <aside className="w-full min-w-0 overflow-hidden border-y border-[var(--site-border)] bg-[var(--site-surface-soft)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]" aria-label="Why travel with us">
      <div className="mx-auto grid w-full max-w-[var(--site-container-width)] gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {(content.items || []).map((item, index) => {
          const itemPath = `items.${index}`;
          return (
            <div className="border-l-2 border-[color:var(--site-accent)] pl-4" key={`${item.title}-${index}`}>
              {item.value && <PreviewField as="strong" path={`${itemPath}.value`} className="block text-3xl text-[var(--site-primary)]">{item.value}</PreviewField>}
              <PreviewField as="span" path={`${itemPath}.title`} className="block font-black">{item.title}</PreviewField>
              {item.description && <PreviewField as="small" path={`${itemPath}.description`} className="mt-1 block leading-5 text-[var(--site-muted)]">{item.description}</PreviewField>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
