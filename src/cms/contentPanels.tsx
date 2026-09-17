import { contentPath } from "./contentUtils";
import type { ReactNode } from "react";
import { FieldValueInput } from "./blockEditor";
import { resolveEntryTemplateId, resolvePageTemplateId, templatesForRoute } from "../templates/registry";
import { Field, FieldIssues, InlineIssueSummary, selectChromeClass, TextArea, TextInput } from "./ui";
import type { CollectionDefinition, CollectionEntry, ContentGraph, PageContent, ValidationIssue } from "../../types";

const panelSectionClass = "overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/70";
const panelSummaryClass = "cursor-pointer px-3 py-2.5 text-[12px] font-semibold text-slate-700 outline-none transition hover:text-slate-950";
const panelInnerClass = "grid gap-2.5 border-t border-slate-200/80 p-2.5";
const secondaryActionClass = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:text-teal-700";
const dangerActionClass = "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100";

function EditorFieldTarget({
  path,
  activeFieldPath,
  onFocusField,
  children,
}: {
  path: string;
  activeFieldPath?: string | null;
  onFocusField?: (path: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      data-cms-editor-field={path}
      data-cms-editor-field-active={activeFieldPath === path ? "true" : undefined}
      onFocusCapture={() => onFocusField?.(path)}
      className={activeFieldPath === path
        ? "relative z-[1] rounded-lg bg-violet-50/90 ring-2 ring-violet-500 ring-offset-4 ring-offset-white transition"
        : "rounded-lg transition"}
    >
      {children}
    </div>
  );
}

export function TechnicalContentPanel({
  item,
  graph,
  definition,
  issues = [],
  onPatch,
  onDuplicate,
  onDelete,
  onUploadAsset,
  onFocusField,
  activeFieldPath,
  showActions = true,
}: {
  item: PageContent | CollectionEntry;
  graph: ContentGraph;
  definition?: CollectionDefinition | null;
  issues?: ValidationIssue[];
  onPatch: (updater: (item: PageContent | CollectionEntry) => void) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<any>;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
  showActions?: boolean;
}) {
  const itemIssues = issues.filter((issue) => issue.targetId === item.id);
  const issuesFor = (...terms: string[]) => {
    const normalizedTerms = terms.map((term) => term.toLowerCase());
    return itemIssues.filter((issue) => {
      const message = issue.message.toLowerCase();
      return normalizedTerms.some((term) => message.includes(term));
    });
  };
  const availableCategories =
    "collectionId" in item && definition
      ? graph.categories.filter((category) =>
          item.categoryIds.includes(category.id) ||
          definition.categoryIds.includes(category.id) ||
          category.collectionIds.length === 0 ||
          category.collectionIds.includes(definition.id),
        )
      : graph.categories;
  const templateOptions = "collectionId" in item ? templatesForRoute("entry") : templatesForRoute("page");
  const currentTemplateId = "collectionId" in item
    ? resolveEntryTemplateId(item, definition)
    : resolvePageTemplateId(item);

  return (
    <div className="space-y-3">
      <InlineIssueSummary issues={itemIssues.filter((issue) => issue.level === "error")} title="Content validation" />
      <div className="grid gap-2.5">
        <EditorFieldTarget path="title" activeFieldPath={activeFieldPath} onFocusField={onFocusField}>
          <Field label="Title">
            <TextInput value={item.title} onChange={(event) => onPatch((draft) => { draft.title = event.target.value; if ("name" in draft) draft.name = event.target.value; })} />
            <FieldIssues issues={issuesFor("missing a title", "same name", "missing a name")} />
          </Field>
        </EditorFieldTarget>
        <Field label="Slug">
          <TextInput value={item.slug} onChange={(event) => onPatch((draft) => { draft.slug = event.target.value; })} />
          <FieldIssues issues={issuesFor("missing a slug", "same slug", "duplicate public route")} />
        </Field>
        <Field label="Status">
          <select data-testid="content-status" className={selectChromeClass} value={item.status} onChange={(event) => onPatch((draft) => { draft.status = event.target.value as any; })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Template">
          <select
            className={selectChromeClass}
            value={currentTemplateId}
            onChange={(event) => onPatch((draft) => { draft.templateId = event.target.value; })}
          >
            {templateOptions.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {"parentId" in item && (
        <details open className={panelSectionClass}>
          <summary className={panelSummaryClass}>Page technical</summary>
          <div className={panelInnerClass}>
            <Field label="Parent Page">
              <select
                className={selectChromeClass}
                value={item.parentId ?? ""}
                onChange={(event) => onPatch((draft) => { if ("parentId" in draft) draft.parentId = event.target.value || null; })}
              >
                <option value="">No parent</option>
                {graph.pages.filter((page) => page.id !== item.id).map((page) => (
                  <option key={page.id} value={page.id}>{page.title}</option>
                ))}
              </select>
              <FieldIssues issues={issuesFor("parent", "circular")} />
            </Field>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
              Header and footer links are managed from the editor Navigation button.
            </p>
          </div>
        </details>
      )}

      {"collectionId" in item && (
        <details open className={panelSectionClass}>
          <summary className={panelSummaryClass}>Entry technical</summary>
          <div className={panelInnerClass}>
            <Field label="Collection">
              <select
                className={selectChromeClass}
                value={item.collectionId}
                onChange={(event) =>
                  onPatch((draft) => {
                    if (!("collectionId" in draft)) return;
                    const nextDefinition = graph.collectionDefinitions.find((collection) => collection.id === event.target.value);
                    draft.collectionId = event.target.value;
                    if (nextDefinition) draft.seo.schemaType = nextDefinition.schemaType;
                  })
                }
              >
                {graph.collectionDefinitions.map((collection) => (
                  <option key={collection.id} value={collection.id}>{collection.name}</option>
                ))}
              </select>
              <FieldIssues issues={issuesFor("missing collection", "references a missing collection")} />
            </Field>
            <Field label="Public Path">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-500 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
                {contentPath(item, graph, definition)}
              </div>
            </Field>
            <EditorFieldTarget path="excerpt" activeFieldPath={activeFieldPath} onFocusField={onFocusField}>
              <Field label="Excerpt">
                <TextArea rows={3} value={item.excerpt ?? ""} onChange={(event) => onPatch((draft) => { if ("excerpt" in draft) draft.excerpt = event.target.value; })} />
              </Field>
            </EditorFieldTarget>
            <EditorFieldTarget path="author" activeFieldPath={activeFieldPath} onFocusField={onFocusField}>
              <Field label="Author">
                <TextInput value={item.author ?? ""} onChange={(event) => onPatch((draft) => { if ("author" in draft) draft.author = event.target.value; })} />
              </Field>
            </EditorFieldTarget>
            <EditorFieldTarget path="publishedAt" activeFieldPath={activeFieldPath} onFocusField={onFocusField}>
              <Field label="Publish date">
                <TextInput type="date" value={item.publishedAt?.slice(0, 10) ?? ""} onChange={(event) => onPatch((draft) => { if ("publishedAt" in draft) draft.publishedAt = event.target.value; })} />
              </Field>
            </EditorFieldTarget>
            {definition?.fields.map((field) => (
              <EditorFieldTarget key={field.id} path={`fields.${field.id}`} activeFieldPath={activeFieldPath} onFocusField={onFocusField}>
                <Field label={field.label}>
                  <FieldValueInput
                    field={field}
                    value={item.fields?.[field.id] ?? ""}
                    onChange={(value) => onPatch((draft) => { if ("fields" in draft) draft.fields[field.id] = value; })}
                    assets={graph.assets}
                    onUploadAsset={onUploadAsset}
                  />
                  <FieldIssues issues={issuesFor(`required field "${field.label.toLowerCase()}"`, `required field "${field.label}"`)} />
                </Field>
              </EditorFieldTarget>
            ))}
            <EditorFieldTarget path="categoryIds" activeFieldPath={activeFieldPath} onFocusField={onFocusField}>
              <Field label="Categories">
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      <input
                        className="accent-teal-600"
                        type="checkbox"
                        checked={item.categoryIds.includes(category.id)}
                        onChange={(event) =>
                          onPatch((draft) => {
                            if (!("categoryIds" in draft)) return;
                            draft.categoryIds = event.target.checked
                              ? [...draft.categoryIds, category.id]
                              : draft.categoryIds.filter((id) => id !== category.id);
                          })
                        }
                      />
                      {category.name}
                    </label>
                  ))}
                  {availableCategories.length === 0 && (
                    <p className="text-xs font-semibold text-slate-400">No categories are available for this collection.</p>
                  )}
                </div>
              </Field>
            </EditorFieldTarget>
          </div>
        </details>
      )}

      {showActions && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onDuplicate} className={secondaryActionClass}>Duplicate</button>
          <button onClick={onDelete} className={dangerActionClass}>Delete</button>
        </div>
      )}
    </div>
  );
}

export function SeoContentPanel({
  item,
  graph,
  definition,
  issues = [],
  onPatch,
  onUploadAsset,
  onFocusField,
  activeFieldPath,
}: {
  item: PageContent | CollectionEntry;
  graph: ContentGraph;
  definition?: CollectionDefinition | null;
  issues?: ValidationIssue[];
  onPatch: (updater: (item: PageContent | CollectionEntry) => void) => void;
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<any>;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
}) {
  const seoIssues = issues.filter((issue) => issue.targetId === item.id && issue.scope === "seo");
  const issuesFor = (...terms: string[]) => {
    const normalizedTerms = terms.map((term) => term.toLowerCase());
    return seoIssues.filter((issue) => {
      const message = issue.message.toLowerCase();
      return normalizedTerms.some((term) => message.includes(term));
    });
  };

  return (
    <div className="space-y-3">
      <InlineIssueSummary issues={seoIssues.filter((issue) => issue.level === "error")} title="SEO validation" />
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
        <p className="text-[12px] font-semibold text-slate-700">Search preview</p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
          <p className="truncate text-sm text-emerald-700">{contentPath(item, graph, definition)}</p>
          <p className="mt-1 truncate text-lg text-blue-700">{item.seo.title || item.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.seo.description || "Add a meta description for this page."}</p>
        </div>
      </div>
      <Field label="SEO Title">
        <TextInput
          value={item.seo.title}
          onChange={(event) =>
            onPatch((draft) => {
              const nextTitle = event.target.value;
              const shouldSyncOgTitle = !draft.seo.ogTitle || draft.seo.ogTitle === draft.seo.title;
              draft.seo.title = nextTitle;
              if (shouldSyncOgTitle) draft.seo.ogTitle = nextTitle;
            })
          }
        />
        <FieldIssues issues={issuesFor("seo title")} />
      </Field>
      <Field label="Description">
        <TextArea
          rows={4}
          value={item.seo.description}
          onChange={(event) =>
            onPatch((draft) => {
              const nextDescription = event.target.value;
              const shouldSyncOgDescription = !draft.seo.ogDescription || draft.seo.ogDescription === draft.seo.description;
              draft.seo.description = nextDescription;
              if (shouldSyncOgDescription) draft.seo.ogDescription = nextDescription;
            })
          }
        />
        <FieldIssues issues={issuesFor("seo description")} />
      </Field>
      <Field label="Canonical">
        <TextInput value={item.seo.canonical ?? ""} onChange={(event) => onPatch((draft) => { draft.seo.canonical = event.target.value; })} />
        <FieldIssues issues={issuesFor("canonical")} />
      </Field>
      <EditorFieldTarget path="seo.ogImage" activeFieldPath={activeFieldPath} onFocusField={onFocusField}>
        <Field label="OG Image">
          <FieldValueInput
            field={{ id: "ogImage", label: "OG Image", type: "image", required: false }}
            value={item.seo.ogImage ?? ""}
            onChange={(value) => onPatch((draft) => { draft.seo.ogImage = value; })}
            assets={graph.assets}
            onUploadAsset={onUploadAsset}
          />
          <FieldIssues issues={issuesFor("opengraph image")} />
        </Field>
      </EditorFieldTarget>
      <Field label="OG Title">
        <TextInput
          value={item.seo.ogTitle || item.seo.title}
          onChange={(event) => onPatch((draft) => { draft.seo.ogTitle = event.target.value; })}
        />
      </Field>
      <Field label="OG Description">
        <TextArea
          rows={3}
          value={item.seo.ogDescription || item.seo.description}
          onChange={(event) => onPatch((draft) => { draft.seo.ogDescription = event.target.value; })}
        />
      </Field>
      <Field label="Robots">
        <select className={selectChromeClass} value={item.seo.robots ?? "index,follow"} onChange={(event) => onPatch((draft) => { draft.seo.robots = event.target.value as any; })}>
          <option value="index,follow">index, follow</option>
          <option value="noindex,follow">noindex, follow</option>
          <option value="noindex,nofollow">noindex, nofollow</option>
        </select>
      </Field>
      <Field label="Schema Type">
        {"collectionId" in item ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
            {definition?.schemaType ?? item.seo.schemaType ?? "WebPage"} schema injected from the collection type.
          </div>
        ) : (
          <select className={selectChromeClass} value={item.seo.schemaType ?? "WebPage"} onChange={(event) => onPatch((draft) => { draft.seo.schemaType = event.target.value as any; })}>
            <option value="WebPage">WebPage</option>
            <option value="Article">Article</option>
            <option value="Product">Product</option>
            <option value="Person">Person</option>
            <option value="CollectionPage">CollectionPage</option>
          </select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Twitter Card">
          <select className={selectChromeClass} value={item.seo.twitterCard ?? "summary_large_image"} onChange={(event) => onPatch((draft) => { draft.seo.twitterCard = event.target.value as any; })}>
            <option value="summary_large_image">large image</option>
            <option value="summary">summary</option>
          </select>
        </Field>
        <Field label="Priority">
          <TextInput type="number" step="0.1" min="0" max="1" value={item.seo.sitemapPriority ?? ""} onChange={(event) => onPatch((draft) => { draft.seo.sitemapPriority = event.target.value === "" ? undefined : Number(event.target.value); })} />
          <FieldIssues issues={issuesFor("sitemap priority")} />
        </Field>
      </div>
    </div>
  );
}
