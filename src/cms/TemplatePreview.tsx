import { Fragment, type MouseEvent } from "react";
import { BlockRenderer } from "../../components/BlockLibrary";
import { blockLabels } from "./constants";
import { EntryPreviewInspector } from "./EntryPreviewInspector";
import { SvgIcon } from "./icons";
import { entryDefinitionFieldPath, type PreviewFieldSource } from "./fieldNavigation";
import { PreviewField, type PreviewFieldIntent } from "./fieldHighlight";
import type { BlockInsertOptions } from "./useCmsController";
import { getCategoryPath, getEntryPath } from "../lib/cms/routing";
import { getContentLocale } from "../localization/registry";
import {
  resolveEntryTemplateId,
  resolvePageTemplateId,
  templatesById,
} from "../templates/registry";
import {
  type BlockData,
  type CollectionDefinition,
  type CollectionEntry,
  type ContentGraph,
  type PageContent,
} from "../../types";

const isRichTextDoc = (value: unknown): value is { content?: unknown[] } =>
  Boolean(value && typeof value === "object" && (value as { type?: string }).type === "doc");

const richTextPlainText = (node: any): string => {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  const children = Array.isArray(node.content) ? node.content.map(richTextPlainText).join("") : "";
  if (["paragraph", "heading", "listItem"].includes(node.type)) return `${children}\n`;
  return children;
};

type SelectPreviewField = (
  blockId: string,
  path: string,
  source?: PreviewFieldSource,
  intent?: PreviewFieldIntent,
) => void;

type SelectItemPreviewField = (
  path: string,
  source?: PreviewFieldSource,
  intent?: PreviewFieldIntent,
) => void;

type OpenSectionPicker = (options?: BlockInsertOptions) => void;

function SelectableBlock({
  block,
  active,
  isFirst,
  isLast,
  sharedBlocks,
  graph,
  subject,
  activeFieldPath,
  onSelect,
  onSelectField,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onOpenSectionPicker,
}: {
  block: BlockData;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
  sharedBlocks: ContentGraph["sharedBlocks"];
  graph: ContentGraph;
  subject: PageContent | CollectionEntry;
  activeFieldPath: string | null;
  onSelect: () => void;
  onSelectField: (path: string, source?: PreviewFieldSource, intent?: PreviewFieldIntent) => void;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onOpenSectionPicker: OpenSectionPicker;
}) {
  const blockLabel = blockLabels[block.type] ?? String(block.type);

  return (
    <div
      role="button"
      aria-pressed={active}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cms-preview-block group relative min-w-0 cursor-pointer outline-none ${
        active ? "cms-preview-block--active z-[1]" : "cms-preview-block--idle"
      }`}
      data-cms-preview-block={block.id}
      data-cms-field-fallback-active={active && activeFieldPath ? "true" : undefined}
    >
      {active && (
        <span className="cms-preview-block-label absolute left-3 top-3 z-20">
          <span aria-hidden="true" className="cms-preview-block-label-dot" />
          {blockLabel}
        </span>
      )}
      {active && (
        <BlockFloatingToolbar
          isFirst={isFirst}
          isLast={isLast}
          onMoveUp={() => onMoveBlock(block.id, -1)}
          onMoveDown={() => onMoveBlock(block.id, 1)}
          onDuplicate={() => onDuplicateBlock(block.id)}
          onRemove={() => onRemoveBlock(block.id)}
          onMore={() => {
            onSelect();
            onOpenSectionPicker({ afterBlockId: block.id });
          }}
        />
      )}
      <BlockRenderer
        block={block}
        sharedBlocks={sharedBlocks}
        graph={graph}
        subject={subject}
        activeFieldPath={active ? activeFieldPath : null}
        onSelectField={(path, source, intent) => {
          if (!active) onSelect();
          onSelectField(path, source, intent);
        }}
      />
    </div>
  );
}

function ToolbarIconButton({
  icon,
  label,
  tone = "neutral",
  disabled,
  onClick,
}: {
  icon: "arrowUp" | "arrowDown" | "copy" | "trash" | "more";
  label: string;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`grid h-7 w-7 place-items-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-35 ${
        tone === "danger"
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-500 hover:bg-slate-100 hover:text-[var(--accent,#6d5dfc)]"
      }`}
    >
      <SvgIcon name={icon} className="h-3.5 w-3.5" />
    </button>
  );
}

function BlockFloatingToolbar({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onMore,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMore: () => void;
}) {
  return (
    <div
      className="cms-preview-block-toolbar absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-lg shadow-slate-950/10 backdrop-blur"
      onClick={(event) => event.stopPropagation()}
    >
      <ToolbarIconButton icon="arrowUp" label="Move section up" disabled={isFirst} onClick={onMoveUp} />
      <ToolbarIconButton icon="arrowDown" label="Move section down" disabled={isLast} onClick={onMoveDown} />
      <ToolbarIconButton icon="copy" label="Duplicate section" onClick={onDuplicate} />
      <ToolbarIconButton icon="more" label="Add section after this section" onClick={onMore} />
      <ToolbarIconButton icon="trash" label="Delete section" tone="danger" onClick={onRemove} />
    </div>
  );
}

function SectionInsertionPoint({
  label,
  onInsert,
}: {
  label: string;
  onInsert: () => void;
}) {
  const stopPointerEvent = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      data-cms-inspector-control
      className="group relative z-30 flex h-0 min-w-0 items-center justify-center"
      onMouseDown={stopPointerEvent}
      onClick={(event) => {
        stopPointerEvent(event);
        onInsert();
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 h-px bg-transparent transition-colors duration-150 group-hover:bg-violet-300 group-focus-within:bg-violet-300"
      />
      <button
        type="button"
        title={label}
        aria-label={label}
        className="absolute inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-violet-300 bg-white text-violet-700 shadow-md shadow-violet-950/10 transition-[width,background-color,border-color,box-shadow] duration-150 hover:w-[7.75rem] hover:border-violet-500 hover:bg-violet-50 hover:shadow-lg focus-visible:w-[7.75rem] focus-visible:border-violet-500 focus-visible:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
      >
        <SvgIcon name="plus" className="h-4 w-4 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-bold opacity-0 transition-[max-width,margin,opacity] duration-150 group-hover:ml-1.5 group-hover:max-w-24 group-hover:opacity-100 group-focus-within:ml-1.5 group-focus-within:max-w-24 group-focus-within:opacity-100">
          Add section
        </span>
      </button>
    </div>
  );
}

function EmptyBlocks({ onOpenSectionPicker }: { onOpenSectionPicker: OpenSectionPicker }) {
  return (
    <div className="grid min-h-[300px] place-items-center p-10 text-center">
      <div>
        <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">Start with a block</h2>
        <p className="mt-2 text-sm text-slate-500">Add a section from the component library.</p>
        <button
          type="button"
          onClick={() => onOpenSectionPicker({ atIndex: 0 })}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
        >
          <SvgIcon name="plus" className="h-4 w-4" />
          Add first section
        </button>
      </div>
    </div>
  );
}

function BlockListPreview({
  item,
  graph,
  activeBlockId,
  activeFieldPath,
  onSelectBlock,
  onSelectField,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onOpenSectionPicker,
}: {
  item: PageContent | CollectionEntry;
  graph: ContentGraph;
  activeBlockId: string | null;
  activeFieldPath: string | null;
  onSelectBlock: (blockId: string) => void;
  onSelectField: SelectPreviewField;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onOpenSectionPicker: OpenSectionPicker;
}) {
  if (item.blocks.length === 0) return <EmptyBlocks onOpenSectionPicker={onOpenSectionPicker} />;

  return (
    <>
      <SectionInsertionPoint
        label="Add section at the beginning"
        onInsert={() => onOpenSectionPicker({ atIndex: 0 })}
      />
      {item.blocks.map((block, index) => (
        <Fragment key={block.id}>
          <SelectableBlock
            block={block}
            active={activeBlockId === block.id}
            isFirst={index === 0}
            isLast={index === item.blocks.length - 1}
            sharedBlocks={graph.sharedBlocks}
            graph={graph}
            subject={item}
            activeFieldPath={activeBlockId === block.id ? activeFieldPath : null}
            onSelect={() => onSelectBlock(block.id)}
            onSelectField={(path, source, intent) => onSelectField(block.id, path, source, intent)}
            onMoveBlock={onMoveBlock}
            onDuplicateBlock={onDuplicateBlock}
            onRemoveBlock={onRemoveBlock}
            onOpenSectionPicker={onOpenSectionPicker}
          />
          <SectionInsertionPoint
            label={index === item.blocks.length - 1 ? "Add section at the end" : "Add section here"}
            onInsert={() => onOpenSectionPicker({ afterBlockId: block.id })}
          />
        </Fragment>
      ))}
    </>
  );
}

function ArticlePreview({
  entry,
  graph,
  definition,
  activeBlockId,
  activeFieldPath,
  onSelectBlock,
  onSelectField,
  onSelectItemField,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onOpenSectionPicker,
}: {
  entry: CollectionEntry;
  graph: ContentGraph;
  definition?: CollectionDefinition | null;
  activeBlockId: string | null;
  activeFieldPath: string | null;
  onSelectBlock: (blockId: string) => void;
  onSelectField: SelectPreviewField;
  onSelectItemField: SelectItemPreviewField;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onOpenSectionPicker: OpenSectionPicker;
}) {
  const fields = entry.fields ?? {};
  const categories = entry.categoryIds
    .map((id) => graph.categories.find((category) => category.id === id))
    .filter(Boolean);
  const featuredImage = String(fields.featuredImage || entry.seo?.ogImage || "");
  const featuredImagePath = fields.featuredImage ? "fields.featuredImage" : "seo.ogImage";
  const bodyPreview = entry.blocks.length
    ? ""
    : isRichTextDoc(fields.body)
      ? richTextPlainText(fields.body).trim()
      : typeof fields.body === "string"
        ? fields.body
        : "";
  const relatedEntries = graph.entries
    .filter((candidate) => candidate.id !== entry.id && candidate.collectionId === entry.collectionId && candidate.status === "published")
    .slice(0, 3);

  return (
    <article className="bg-white text-slate-950">
      <EntryPreviewInspector
        entry={entry}
        definition={definition}
        locale={getContentLocale(entry, graph.site)}
        activePath={activeBlockId ? null : activeFieldPath}
        onSelectField={onSelectItemField}
      >
        <header className="mx-auto max-w-5xl px-8 py-20 text-center">
          {definition && <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">{definition.singularName}</p>}
          <PreviewField as="h1" path="title" className="mx-auto max-w-4xl break-words text-5xl font-black leading-[1.04] tracking-[-0.055em] lg:text-6xl">
            {entry.title}
          </PreviewField>
          {entry.excerpt && <PreviewField as="p" path="excerpt" className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-slate-600">{entry.excerpt}</PreviewField>}
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            {entry.author && <PreviewField path="author">{entry.author}</PreviewField>}
            {entry.publishedAt && <PreviewField path="publishedAt">{new Date(entry.publishedAt).toLocaleDateString("en")}</PreviewField>}
            {fields.readingTime && <PreviewField path={entryDefinitionFieldPath("readingTime")}>{String(fields.readingTime)}</PreviewField>}
          </div>
          {categories.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <PreviewField as="a" path="categoryIds" key={category!.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600" href={getCategoryPath(category!, graph)}>
                  {category!.name}
                </PreviewField>
              ))}
            </div>
          )}
        </header>

        {featuredImage && (
          <div className="mx-auto max-w-6xl px-8">
            <PreviewField as="img" path={featuredImagePath} className="h-[420px] w-full rounded-3xl object-cover shadow-2xl shadow-slate-300/40" src={featuredImage} alt={String(fields.featuredImageAlt || entry.title)} />
          </div>
        )}
      </EntryPreviewInspector>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_260px] gap-12 px-8 py-16">
        <div className="min-w-0">
          {bodyPreview && (
            <div className="mb-10 rounded-3xl border border-slate-200 bg-white p-8 text-lg leading-8 text-slate-600 shadow-sm">
              {bodyPreview.split(/\n{2,}/).slice(0, 4).map((paragraph, index) => (
                <p key={index} className="mb-4 last:mb-0">{paragraph}</p>
              ))}
            </div>
          )}
          <BlockListPreview
            item={entry}
            graph={graph}
            activeBlockId={activeBlockId}
            activeFieldPath={activeFieldPath}
            onSelectBlock={onSelectBlock}
            onSelectField={onSelectField}
            onMoveBlock={onMoveBlock}
            onDuplicateBlock={onDuplicateBlock}
            onRemoveBlock={onRemoveBlock}
            onOpenSectionPicker={onOpenSectionPicker}
          />
        </div>
        <aside className="grid content-start gap-5">
          {categories.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950">Topics</p>
              <div className="grid gap-2">
                {categories.map((category) => (
                  <a key={category!.id} className="text-sm font-bold text-slate-600" href={getCategoryPath(category!, graph)}>{category!.name}</a>
                ))}
              </div>
            </div>
          )}
          {relatedEntries.length > 0 && definition && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950">Related</p>
              <div className="grid gap-2">
                {relatedEntries.map((related) => (
                  <a key={related.id} className="text-sm font-bold text-slate-600" href={getEntryPath(related, definition, graph)}>{related.title}</a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

function AuthorPreview({
  entry,
  graph,
  definition,
  activeBlockId,
  activeFieldPath,
  onSelectBlock,
  onSelectField,
  onSelectItemField,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onOpenSectionPicker,
}: {
  entry: CollectionEntry;
  graph: ContentGraph;
  definition?: CollectionDefinition | null;
  activeBlockId: string | null;
  activeFieldPath: string | null;
  onSelectBlock: (blockId: string) => void;
  onSelectField: SelectPreviewField;
  onSelectItemField: SelectItemPreviewField;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onOpenSectionPicker: OpenSectionPicker;
}) {
  const fields = entry.fields ?? {};
  const photo = String(fields.photo || fields.avatar || fields.featuredImage || entry.seo?.ogImage || "");
  const photoPath = fields.photo
    ? "fields.photo"
    : fields.avatar
      ? "fields.avatar"
      : fields.featuredImage
        ? "fields.featuredImage"
        : "seo.ogImage";
  const bioPath = fields.bio ? "fields.bio" : "excerpt";

  return (
    <article className="bg-white px-8 py-20 text-slate-950">
      <EntryPreviewInspector
        entry={entry}
        definition={definition}
        locale={getContentLocale(entry, graph.site)}
        activePath={activeBlockId ? null : activeFieldPath}
        onSelectField={onSelectItemField}
      >
        <header className="mx-auto grid max-w-5xl grid-cols-[320px_minmax(0,1fr)] items-center gap-12">
          {photo && <PreviewField as="img" path={photoPath} className="aspect-square w-full rounded-3xl object-cover shadow-2xl shadow-slate-300/40" src={photo} alt={entry.title} />}
          <div>
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Author</p>
            <PreviewField as="h1" path="title" className="text-6xl font-black leading-none tracking-[-0.07em]">{entry.title}</PreviewField>
            {fields.role && <PreviewField as="p" path={entryDefinitionFieldPath("role")} className="mt-5 text-sm font-black uppercase tracking-[0.14em] text-blue-800">{String(fields.role)}</PreviewField>}
            {(fields.bio || entry.excerpt) && <PreviewField as="p" path={bioPath} className="mt-5 text-xl leading-8 text-slate-600">{String(fields.bio || entry.excerpt)}</PreviewField>}
          </div>
        </header>
      </EntryPreviewInspector>
      <div className="mx-auto mt-16 max-w-5xl">
        <BlockListPreview
          item={entry}
          graph={graph}
          activeBlockId={activeBlockId}
          activeFieldPath={activeFieldPath}
          onSelectBlock={onSelectBlock}
          onSelectField={onSelectField}
          onMoveBlock={onMoveBlock}
          onDuplicateBlock={onDuplicateBlock}
          onRemoveBlock={onRemoveBlock}
          onOpenSectionPicker={onOpenSectionPicker}
        />
      </div>
    </article>
  );
}

export function TemplatePreview({
  item,
  graph,
  definition,
  activeBlockId,
  activeFieldPath,
  onSelectBlock,
  onSelectField,
  onSelectItemField,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onOpenSectionPicker,
}: {
  item: PageContent | CollectionEntry;
  graph: ContentGraph;
  definition?: CollectionDefinition | null;
  activeBlockId: string | null;
  activeFieldPath: string | null;
  onSelectBlock: (blockId: string) => void;
  onSelectField: SelectPreviewField;
  onSelectItemField: SelectItemPreviewField;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onOpenSectionPicker: OpenSectionPicker;
}) {
  const templateId = "collectionId" in item ? resolveEntryTemplateId(item, definition) : resolvePageTemplateId(item);
  const template = templatesById[templateId];

  if ("collectionId" in item && templateId === "article-standard") {
    return (
      <div>
        <TemplateBadge label={template?.label ?? "Article"} />
        <ArticlePreview
          entry={item}
          graph={graph}
          definition={definition}
          activeBlockId={activeBlockId}
          activeFieldPath={activeFieldPath}
          onSelectBlock={onSelectBlock}
          onSelectField={onSelectField}
          onSelectItemField={onSelectItemField}
          onMoveBlock={onMoveBlock}
          onDuplicateBlock={onDuplicateBlock}
          onRemoveBlock={onRemoveBlock}
          onOpenSectionPicker={onOpenSectionPicker}
        />
      </div>
    );
  }

  if ("collectionId" in item && templateId === "author-profile") {
    return (
      <div>
        <TemplateBadge label={template?.label ?? "Author Profile"} />
        <AuthorPreview
          entry={item}
          graph={graph}
          definition={definition}
          activeBlockId={activeBlockId}
          activeFieldPath={activeFieldPath}
          onSelectBlock={onSelectBlock}
          onSelectField={onSelectField}
          onSelectItemField={onSelectItemField}
          onMoveBlock={onMoveBlock}
          onDuplicateBlock={onDuplicateBlock}
          onRemoveBlock={onRemoveBlock}
          onOpenSectionPicker={onOpenSectionPicker}
        />
      </div>
    );
  }

  return (
    <div>
      <TemplateBadge label={template?.label ?? "Landing Page"} />
      <BlockListPreview
        item={item}
        graph={graph}
        activeBlockId={activeBlockId}
        activeFieldPath={activeFieldPath}
        onSelectBlock={onSelectBlock}
        onSelectField={onSelectField}
        onMoveBlock={onMoveBlock}
        onDuplicateBlock={onDuplicateBlock}
        onRemoveBlock={onRemoveBlock}
        onOpenSectionPicker={onOpenSectionPicker}
      />
    </div>
  );
}

function TemplateBadge({ label }: { label: string }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
        Template: {label}
      </span>
    </div>
  );
}
