import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BlockRenderer } from "../../components/BlockLibrary";
import { blockDefinitions, cloneDefaultBlockContent } from "../blocks/registry";
import { getCategoryPath, getCollectionPath, getEntryPath, getPagePath, getPublicRouteRecords, resolveNavigationHref } from "../lib/cms/routing";
import {
  getDefaultCollectionTemplateId,
  getDefaultEntryTemplateId,
  resolveEntryTemplateId,
  resolvePageTemplateId,
  templatesForRoute,
} from "../templates/registry";
import { blockLabels, fieldTypes, issueTone, statusTone } from "./constants";
import { clone, contentPath, createId, slugify } from "./contentUtils";
import { nestedBlockFieldPrefix } from "./fieldNavigation";
import { BlockEditor, BlockManualFields, FieldValueInput } from "./blockEditor";
import { MediaLibraryManager } from "./media/MediaLibrary";
import { Field, selectChromeClass, TextArea, TextInput } from "./ui";
import {
  BlockType,
  type BlockTypeId,
  type AssetMeta,
  type BlockData,
  type Category,
  type CollectionDefinition,
  type CollectionEntry,
  type ContentGraph,
  type FieldDefinition,
  type FieldType,
  type NavigationItem,
  type NavigationMenu,
  type PageContent,
  type RedirectRule,
  type SharedBlock,
  type ValidationIssue,
} from "../../types";

const hasTextValue = (value?: string | null) => Boolean(value && value.trim().length > 0);
const reservedRouteSegments = new Set(["admin", "api", "assets", "category", "cms", "login", "logout", "media", "uploads"]);
const normalizeRouteSegment = (value?: string | null) => slugify((value ?? "").replace(/^\/+|\/+$/g, ""));
const normalizeFieldKey = (value: string) =>
  slugify(value)
    .split("-")
    .map((part, index) => index === 0 ? part : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("");
const makeUniqueFieldKey = (label: string, fields: FieldDefinition[]) => {
  const baseKey = normalizeFieldKey(label) || "field";
  const usedKeys = new Set(fields.map((field) => field.id.toLowerCase()));
  if (!usedKeys.has(baseKey.toLowerCase())) return baseKey;

  let index = 2;
  let candidate = `${baseKey}${index}`;
  while (usedKeys.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `${baseKey}${index}`;
  }
  return candidate;
};
const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
};

const thumbnailFieldKeys = new Set([
  "featuredImage",
  "ogImage",
  "bgImage",
  "backgroundImage",
  "image",
  "imageUrl",
  "imageSrc",
  "carImage",
  "thumbnail",
  "photo",
  "src",
  "path",
]);

const findFirstImageReference = (value: unknown, depth = 0): string => {
  if (!value || depth > 5) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findFirstImageReference(item, depth + 1);
      if (match) return match;
    }

    return "";
  }

  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  for (const key of thumbnailFieldKeys) {
    const match = firstString(record[key]);
    if (match) return match;
  }

  for (const child of Object.values(record)) {
    const match = findFirstImageReference(child, depth + 1);
    if (match) return match;
  }

  return "";
};

const resolveContentThumbnail = (item: PageContent | CollectionEntry, graph: ContentGraph) => {
  if (item.kind === "collectionEntry") {
    return firstString(
      item.fields?.featuredImage,
      item.fields?.image,
      item.fields?.thumbnail,
      item.fields?.photo,
      item.seo?.ogImage,
      findFirstImageReference(item.blocks),
      graph.site.defaultOgImage,
      graph.assets[0]?.url,
    );
  }

  return firstString(item.seo?.ogImage, findFirstImageReference(item.blocks), graph.site.defaultOgImage, graph.assets[0]?.url);
};

const normalizeSearchValue = (value: unknown) => String(value ?? "").toLowerCase().trim();

export function ContentButton({
  active,
  label,
  meta,
  status,
  onClick,
}: {
  active: boolean;
  label: string;
  meta: string;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full min-w-0 rounded-2xl border p-4 text-left transition ${
        active ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <strong className="min-w-0 truncate text-sm">{label}</strong>
        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${statusTone[status as keyof typeof statusTone]}`}>
          {status}
        </span>
      </div>
      <div className="mt-1 truncate text-xs font-bold text-slate-400">{meta}</div>
    </button>
  );
}

export function PageDirectory({
  graph,
  header,
  title = "Pages",
  description = "Choose an item to open its editing workspace.",
  actionLabel = "Add page",
  scope = "pages",
  onCreate,
  onEdit,
}: {
  graph: ContentGraph;
  header?: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  scope?: "all" | "pages" | { collectionId: string };
  onCreate: () => void;
  onEdit: (selection: { kind: "page" | "entry"; id: string }) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");
  const [sortOrder, setSortOrder] = useState<"updated" | "title">("updated");
  const rows = useMemo(() => [
    ...graph.pages.map((page) => {
      const route = contentPath(page, graph);
      const subtitle = page.seo.description || page.navigationLabel || "One-off website page";
      const template = page.templateId || "Landing page";
      const meta = page.showInNavigation ? "In navigation" : "Hidden from navigation";

      return {
        id: page.id,
        key: `page-${page.id}`,
        kind: "page" as const,
        title: page.title,
        subtitle,
        type: "Page",
        route,
        status: page.status,
        blocks: page.blocks.length,
        template,
        meta,
        updatedAt: page.updatedAt,
        thumbnailUrl: resolveContentThumbnail(page, graph),
        searchText: [page.title, subtitle, "Page", route, page.status, template, meta, `${page.blocks.length} blocks`]
          .map(normalizeSearchValue)
          .join(" "),
      };
    }),
    ...graph.entries.map((entry) => {
      const definition = graph.collectionDefinitions.find((candidate) => candidate.id === entry.collectionId);
      const categories = entry.categoryIds
        .map((categoryId) => graph.categories.find((category) => category.id === categoryId)?.name)
        .filter(Boolean)
        .join(", ");
      const route = contentPath(entry, graph, definition);
      const subtitle = entry.excerpt || definition?.description || "Collection entry";
      const type = definition?.singularName ?? "Entry";
      const template = entry.templateId || definition?.entryTemplateId || "Article";
      const meta = categories || definition?.name || "No categories";

      return {
        id: entry.id,
        key: `entry-${entry.id}`,
        kind: "entry" as const,
        title: entry.title,
        subtitle,
        type,
        route,
        status: entry.status,
        blocks: entry.blocks.length,
        template,
        meta,
        updatedAt: entry.updatedAt,
        thumbnailUrl: resolveContentThumbnail(entry, graph),
        searchText: [
          entry.title,
          subtitle,
          type,
          route,
          entry.status,
          template,
          meta,
          entry.author,
          entry.publishedAt,
          `${entry.blocks.length} blocks`,
        ]
          .map(normalizeSearchValue)
          .join(" "),
      };
    }),
  ].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)), [graph]);
  const filteredRows = useMemo(() => {
    const query = normalizeSearchValue(searchQuery);
    const scopedRows = rows.filter((row) => {
      if (scope === "all") return true;
      if (scope === "pages") return row.kind === "page";
      return row.kind === "entry" && graph.entries.some((entry) => entry.id === row.id && entry.collectionId === scope.collectionId);
    });
    const matchingRows = scopedRows.filter((row) => {
      const matchesQuery = !query || row.searchText.includes(query);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    return [...matchingRows].sort((first, second) =>
      sortOrder === "title"
        ? first.title.localeCompare(second.title)
        : second.updatedAt.localeCompare(first.updatedAt),
    );
  }, [graph.entries, rows, scope, searchQuery, sortOrder, statusFilter]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#e1e4e8] bg-white">
      {header && <div className="border-b border-[#e4e7ec] px-4 py-3">{header}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7ec] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="shrink-0 text-sm font-semibold text-[#1d2433]">{title}</h2>
          <span className="rounded-full bg-[#eef1f5] px-2 py-0.5 text-[11px] font-semibold text-[#667085]">
            {filteredRows.length}
          </span>
          <p className="hidden truncate text-xs font-normal text-[#7c8595] lg:block">{description}</p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex h-9 items-center rounded-lg bg-[#6755e7] px-3.5 text-sm font-semibold text-white transition hover:bg-[#5847d0]"
        >
          {actionLabel}
        </button>
      </div>

      <div className="border-b border-[#e4e7ec] bg-[#fafbfc] px-3 py-2 sm:px-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_160px]">
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-[#d9dee7] bg-white px-3 text-[#667085]">
            <span className="text-sm leading-none">⌕</span>
            <span className="sr-only">Search content</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#172033] outline-none placeholder:text-[#98a2b3]"
              placeholder="Search content..."
            />
          </label>
          <label className="sr-only" htmlFor="content-status-filter">Filter by status</label>
          <select
            id="content-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="h-10 rounded-lg border border-[#d9dee7] bg-white px-3 text-sm font-semibold text-[#344054] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <label className="sr-only" htmlFor="content-sort-order">Sort content</label>
          <select
            id="content-sort-order"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
            className="h-10 rounded-lg border border-[#d9dee7] bg-white px-3 text-sm font-semibold text-[#344054] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="updated">Recently updated</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {filteredRows.map((row) => (
          <article key={row.key} className="rounded-xl border border-[#e4e7ec] bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="relative grid h-12 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#e4e7ec] bg-[#f8fafc] text-sm text-[#6d5dfc]">
                {row.kind === "page" ? "▣" : "✎"}
                {row.thumbnailUrl && <img src={row.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-bold text-[#111827]">{row.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${statusTone[row.status as keyof typeof statusTone]}`}>{row.status}</span>
                </div>
                <p className="mt-1 truncate text-xs text-[#667085]">{row.type} · {row.route}</p>
                <p className="mt-2 text-xs text-[#667085]">Updated {new Date(row.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEdit({ kind: row.kind, id: row.id })}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg border border-[#d9dee7] bg-white text-sm font-bold text-[#344054] transition hover:border-violet-300 hover:text-violet-700"
            >
              Edit content
            </button>
          </article>
        ))}
        {filteredRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d9dee7] px-5 py-10 text-center text-sm text-[#667085]">
            {searchQuery.trim() ? "No content matches your search." : "No pages or entries yet."}
          </div>
        )}
      </div>

      <div className="hidden max-h-120 overflow-auto md:block">
        <table className="min-w-full table-fixed border-separate border-spacing-0 text-left text-xs">
          <thead className="bg-[#fafbfc] text-xs font-medium text-[#7c8595]">
            <tr>
              <th className="w-[42%] border-b border-[#e4e7ec] px-2 py-3">Title</th>
              <th className="w-[8%] border-b border-[#e4e7ec] px-2 py-3">Type</th>
              <th className="w-[16%] border-b border-[#e4e7ec] px-2 py-3">Route</th>
              <th className="w-[11%] border-b border-[#e4e7ec] px-2 py-3">Status</th>
              <th className="w-[13%] border-b border-[#e4e7ec] px-2 py-3">Template</th>
              <th className="w-[10%] border-b border-[#e4e7ec] px-2 py-3">Updated</th>
              <th className="w-[8%] border-b border-[#e4e7ec] px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.key} className="transition hover:bg-[#fbfaff]">
                <td className="border-b border-[#edf0f4] px-2 py-2.5">
                  <button onClick={() => onEdit({ kind: row.kind, id: row.id })} className="group flex min-w-0 items-center gap-2 text-left">
                    <span className="relative grid h-8 w-9 shrink-0 place-items-center overflow-hidden rounded-md border border-[#e4e7ec] bg-[#f8fafc] text-xs text-[#6d5dfc]">
                      {row.kind === "page" ? "▣" : "✎"}
                      {row.thumbnailUrl && (
                        <img
                          src={row.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.remove();
                          }}
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#111827] group-hover:text-[#6247ff]">{row.title}</span>
                      <span className="block max-w-62.5 truncate text-xs font-normal text-[#667085]">{row.subtitle}</span>
                    </span>
                  </button>
                </td>
                <td className="truncate border-b border-[#edf0f4] px-2 py-2.5 font-semibold text-[#475467]">{row.type}</td>
                <td className="truncate border-b border-[#edf0f4] px-2 py-2.5 font-mono text-[11px] font-semibold text-[#475467]">{row.route}</td>
                <td className="border-b border-[#edf0f4] px-2 py-2.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone[row.status as keyof typeof statusTone]}`}>{row.status}</span>
                </td>
                <td className="truncate border-b border-[#edf0f4] px-2 py-2.5 font-semibold text-[#475467]">{row.template}</td>
                <td className="whitespace-nowrap border-b border-[#edf0f4] px-2 py-2.5 text-[11px] font-semibold text-[#667085]">{new Date(row.updatedAt).toLocaleDateString()}</td>
                <td className="border-b border-[#edf0f4] px-4 py-2.5 text-right">
                  <button onClick={() => onEdit({ kind: row.kind, id: row.id })} className="rounded-lg border border-[#d9dee7] bg-white px-3 py-1.5 text-xs font-semibold text-[#4f3fc3] transition hover:border-[#c7b8ff] hover:bg-[#f6f4ff]">Edit</button>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="border-b border-[#edf0f4] px-5 py-10 text-center text-sm font-semibold text-[#667085]">
                  {searchQuery.trim() ? "No content matches your search." : "No pages or entries yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function IssueList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 text-emerald-700">
        <strong>No validation issues.</strong>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-black tracking-[-0.04em]">Validation</h2>
      <div className="grid gap-3">
        {issues.map((issue) => (
          <div key={issue.id} className={`rounded-2xl border px-4 py-3 text-sm ${issueTone[issue.level]}`}>
            <strong className="mr-2 uppercase">{issue.level}</strong>
            {issue.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContentEditor({
  item,
  graph,
  definition,
  blocksDraft,
  blocksError,
  onBlocksDraft,
  onApplyBlocks,
  onAddBlock,
  onPatch,
  onPatchBlock,
  onRemoveBlock,
  onDuplicateBlock,
  onMoveBlock,
  onDuplicate,
  onDelete,
}: {
  item: PageContent | CollectionEntry;
  graph: ContentGraph;
  definition?: CollectionDefinition | null;
  blocksDraft: string;
  blocksError: string;
  onBlocksDraft: (value: string) => void;
  onApplyBlocks: () => void;
  onAddBlock: (type: BlockTypeId) => void;
  onPatch: (updater: (item: PageContent | CollectionEntry) => void) => void;
  onPatchBlock: (blockId: string, updater: (block: BlockData) => void) => void;
  onRemoveBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
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
    <div className="min-w-0 space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
              {"collectionId" in item ? definition?.singularName ?? "Entry" : "Page"}
            </p>
            <h2 className="text-2xl font-black tracking-[-0.05em]">{item.title}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={onDuplicate} className="rounded-2xl border border-slate-200 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
              Duplicate
            </button>
            <button onClick={onDelete} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-rose-600">
              Delete
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title">
            <TextInput value={item.title} onChange={(event) => onPatch((draft) => { draft.title = event.target.value; if ("name" in draft) draft.name = event.target.value; })} />
          </Field>
          <Field label="Slug">
            <TextInput value={item.slug} onChange={(event) => onPatch((draft) => { draft.slug = event.target.value; })} />
          </Field>
          <Field label="Status">
            <select className={selectChromeClass} value={item.status} onChange={(event) => onPatch((draft) => { draft.status = event.target.value as any; })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Template">
            <select className={selectChromeClass} value={currentTemplateId} onChange={(event) => onPatch((draft) => { draft.templateId = event.target.value; })}>
              {templateOptions.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>
          </Field>
          {"collectionId" in item && (
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
            </Field>
          )}
          {"collectionId" in item && (
            <Field label="Public Path">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                {contentPath(item, graph, definition)}
              </div>
            </Field>
          )}
          {"collectionId" in item && (
            <>
              <Field label="Excerpt">
                <TextArea rows={3} value={item.excerpt ?? ""} onChange={(event) => onPatch((draft) => { if ("excerpt" in draft) draft.excerpt = event.target.value; })} />
              </Field>
              <Field label="Author">
                <TextInput value={item.author ?? ""} onChange={(event) => onPatch((draft) => { if ("author" in draft) draft.author = event.target.value; })} />
              </Field>
            </>
          )}
        </div>
      </div>

      {"parentId" in item && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-black tracking-[-0.04em]">Page structure</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Parent Page">
              <select
                className={selectChromeClass}
                value={item.parentId ?? ""}
                onChange={(event) => onPatch((draft) => { if ("parentId" in draft) draft.parentId = event.target.value || null; })}
              >
                <option value="">No parent</option>
                {graph.pages
                  .filter((page) => page.id !== item.id)
                  .map((page) => (
                    <option key={page.id} value={page.id}>{page.title}</option>
                  ))}
              </select>
            </Field>
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
              Header and footer links are managed from the editor Navigation button.
            </p>
          </div>
        </div>
      )}

      {"collectionId" in item && definition && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-black tracking-[-0.04em]">Collection fields</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {definition.fields.map((field) => (
              <Field key={field.id} label={field.label}>
                <FieldValueInput
                  field={field}
                  value={item.fields?.[field.id] ?? ""}
                  onChange={(value) => onPatch((draft) => { if ("fields" in draft) draft.fields[field.id] = value; })}
                />
              </Field>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {availableCategories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                <input
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
              <p className="text-xs font-bold text-slate-400">No categories are available for this collection.</p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-black tracking-[-0.04em]">SEO</h3>
        <div className="grid gap-4 md:grid-cols-2">
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
          </Field>
          <Field label="Canonical">
            <TextInput value={item.seo.canonical ?? ""} onChange={(event) => onPatch((draft) => { draft.seo.canonical = event.target.value; })} />
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
          </Field>
          <Field label="OG Image">
            <TextInput value={item.seo.ogImage ?? ""} onChange={(event) => onPatch((draft) => { draft.seo.ogImage = event.target.value; })} />
          </Field>
          <Field label="OG Title">
            <TextInput value={item.seo.ogTitle || item.seo.title} onChange={(event) => onPatch((draft) => { draft.seo.ogTitle = event.target.value; })} />
          </Field>
          <Field label="OG Description">
            <TextArea rows={3} value={item.seo.ogDescription || item.seo.description} onChange={(event) => onPatch((draft) => { draft.seo.ogDescription = event.target.value; })} />
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
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
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
          <Field label="Twitter Card">
            <select className={selectChromeClass} value={item.seo.twitterCard ?? "summary_large_image"} onChange={(event) => onPatch((draft) => { draft.seo.twitterCard = event.target.value as any; })}>
              <option value="summary_large_image">summary_large_image</option>
              <option value="summary">summary</option>
            </select>
          </Field>
          <Field label="Sitemap Change Frequency">
            <select className={selectChromeClass} value={item.seo.changeFrequency ?? "weekly"} onChange={(event) => onPatch((draft) => { draft.seo.changeFrequency = event.target.value as any; })}>
              <option value="always">always</option>
              <option value="hourly">hourly</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
              <option value="never">never</option>
            </select>
          </Field>
          <Field label="Sitemap Priority">
            <TextInput type="number" step="0.1" min="0" max="1" value={item.seo.sitemapPriority ?? ""} onChange={(event) => onPatch((draft) => { draft.seo.sitemapPriority = event.target.value === "" ? undefined : Number(event.target.value); })} />
          </Field>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black tracking-[-0.04em]">Internal link references</h3>
        <p className="mt-1 text-sm text-slate-500">Use stable content IDs in rich text links as <code>content:item-id</code>. Validation catches missing IDs before publish.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[...graph.pages, ...graph.entries, ...graph.categories].map((target: any) => (
            <button
              key={target.id}
              onClick={() => navigator.clipboard?.writeText(`content:${target.id}`)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600"
            >
              {target.title ?? target.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black tracking-[-0.04em]">Blocks</h3>
          <div className="flex flex-wrap gap-2">
            {blockDefinitions.map((definition) => (
              <button key={definition.type} onClick={() => onAddBlock(definition.type)} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {definition.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {item.blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={index}
              isFirst={index === 0}
              isLast={index === item.blocks.length - 1}
              onPatch={(updater) => onPatchBlock(block.id, updater)}
              onRemove={() => onRemoveBlock(block.id)}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onMove={(direction) => onMoveBlock(block.id, direction)}
            />
          ))}
          {item.blocks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
              No blocks yet. Add a block type above.
            </div>
          )}
        </div>
        <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-[11px] font-black uppercase tracking-widest text-slate-500">Advanced block JSON</summary>
          <TextArea rows={12} value={blocksDraft} onChange={(event) => onBlocksDraft(event.target.value)} className="mt-4 font-mono" />
          <div className="mt-3 flex items-center gap-3">
            <button onClick={onApplyBlocks} className="rounded-2xl bg-slate-950 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white">Apply block JSON</button>
            {blocksError && <span className="text-sm font-bold text-rose-600">{blocksError}</span>}
          </div>
        </details>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-black tracking-[-0.04em]">Visual preview</h3>
        </div>
        <div className="max-h-[720px] overflow-auto">
          {item.blocks.map((block) => <BlockRenderer key={block.id} block={block} sharedBlocks={graph.sharedBlocks} graph={graph} subject={item} />)}
        </div>
      </div>
    </div>
  );
}

export function CollectionDirectory({
  graph,
  presets,
  onAddPreset,
  onPatch,
  onDelete,
}: {
  graph: ContentGraph;
  presets: CollectionDefinition[];
  onAddPreset: (preset: CollectionDefinition) => string | void;
  onPatch: (definitionId: string, updates: Partial<CollectionDefinition>) => void;
  onDelete: (definitionId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<{ label: string; type: FieldType; required: boolean } | null>(null);
  const editingDefinition = graph.collectionDefinitions.find((definition) => definition.id === editingId) ?? null;
  const entryTemplateOptions = templatesForRoute("entry");
  const collectionTemplateOptions = templatesForRoute("collection");

  const patchEditingDefinition = (updates: Partial<CollectionDefinition>) => {
    if (!editingDefinition) return;
    onPatch(editingDefinition.id, updates);
  };

  const updateField = (fieldId: string, updates: Partial<FieldDefinition>) => {
    if (!editingDefinition) return;
    patchEditingDefinition({
      fields: editingDefinition.fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field,
      ),
    });
  };

  const addField = () => {
    if (!editingDefinition) return;
    const field: FieldDefinition = {
      id: makeUniqueFieldKey(fieldDraft?.label || "New Field", editingDefinition.fields),
      label: fieldDraft?.label.trim() || "New Field",
      type: fieldDraft?.type ?? "text",
      required: fieldDraft?.required ?? false,
    };
    patchEditingDefinition({ fields: [...editingDefinition.fields, field] });
    setFieldDraft(null);
  };

  const removeField = (fieldId: string) => {
    if (!editingDefinition) return;
    const usedEntries = graph.entries.filter(
      (entry) =>
        entry.collectionId === editingDefinition.id &&
        entry.fields &&
        Object.prototype.hasOwnProperty.call(entry.fields, fieldId) &&
        hasTextValue(String(entry.fields[fieldId] ?? "")),
    ).length;
    if (usedEntries > 0) {
      const copy = usedEntries === 1 ? "1 entry has" : `${usedEntries} entries have`;
      if (!window.confirm(`Remove this field? ${copy} saved values for it.`)) return;
    }
    patchEditingDefinition({ fields: editingDefinition.fields.filter((field) => field.id !== fieldId) });
  };

  const entryCount = (definitionId: string) =>
    graph.entries.filter((entry) => entry.collectionId === definitionId).length;
  const routeExample = (definition: CollectionDefinition) =>
    getEntryPath({ slug: "example-entry" } as CollectionEntry, definition, graph);
  const indexPath = (definition: CollectionDefinition) => getCollectionPath(definition, graph);
  const availableCategoryCount = (definition: CollectionDefinition) =>
    graph.categories.filter((category) =>
      definition.categoryIds.includes(category.id) ||
      category.collectionIds.length === 0 ||
      category.collectionIds.includes(definition.id),
    ).length;
  const isIndexSeoReady = (definition: CollectionDefinition) =>
    !definition.publicIndex || (hasTextValue(definition.seo.title) && hasTextValue(definition.seo.description));
  const isRouteReady = (definition: CollectionDefinition) => hasTextValue(definition.slug);
  const isModelReady = (definition: CollectionDefinition) =>
    hasTextValue(definition.name) && hasTextValue(definition.singularName);
  const isCategoryEnabled = (definition: CollectionDefinition, category: Category) =>
    definition.categoryIds.includes(category.id) ||
    (category.collectionIds.length > 0 && category.collectionIds.includes(definition.id));
  const collectionRouteConflict = (definition: CollectionDefinition) => {
    const routeKey = `${definition.routeParentId ?? "__root__"}:${normalizeRouteSegment(definition.slug)}`;
    return graph.collectionDefinitions.find(
      (candidate) =>
        candidate.id !== definition.id &&
        `${candidate.routeParentId ?? "__root__"}:${normalizeRouteSegment(candidate.slug)}` === routeKey,
    );
  };
  const publicIndexRouteConflict = (definition: CollectionDefinition) => {
    if (!definition.publicIndex) return null;
    const path = indexPath(definition);
    const pageConflict = graph.pages.find((page) => getPagePath(page, graph) === path);
    if (pageConflict) return `Page "${pageConflict.title}" already uses ${path}.`;

    const publicRouteConflict = getPublicRouteRecords(graph).find(
      (route) => route.id !== definition.id && route.path === path,
    );
    if (!publicRouteConflict) return null;
    return `Another public ${publicRouteConflict.type} already uses ${path}.`;
  };
  const fieldKeyIssues = (definition: CollectionDefinition) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    definition.fields.forEach((field) => {
      const key = field.id.trim().toLowerCase();
      if (!key) return;
      if (seen.has(key)) duplicates.add(field.id);
      seen.add(key);
    });
    return [...duplicates];
  };
  const modelSafetyMessages = (definition: CollectionDefinition) => {
    const messages: string[] = [];
    const normalizedSlug = normalizeRouteSegment(definition.slug);
    const routeConflict = collectionRouteConflict(definition);
    const indexConflict = publicIndexRouteConflict(definition);
    const duplicateFieldKeys = fieldKeyIssues(definition);

    if (!isModelReady(definition)) messages.push("Add a collection name and singular entry name.");
    if (!isRouteReady(definition)) messages.push("Add a URL segment before publishing entries.");
    if (reservedRouteSegments.has(normalizedSlug)) messages.push(`"${normalizedSlug}" is reserved. Use a different URL segment.`);
    if (routeConflict) messages.push(`"${definition.slug}" is already used by the ${routeConflict.name} collection in the same route parent.`);
    if (indexConflict) messages.push(indexConflict);
    if (definition.publicIndex && !isIndexSeoReady(definition)) messages.push("The index page needs an SEO title and description.");
    if (duplicateFieldKeys.length > 0) messages.push(`Duplicate field keys: ${duplicateFieldKeys.join(", ")}.`);

    return messages;
  };
  const patchCategoryAllowance = (categoryId: string, checked: boolean) => {
    if (!editingDefinition) return;
    patchEditingDefinition({
      categoryIds: checked
        ? [...new Set([...editingDefinition.categoryIds, categoryId])]
        : editingDefinition.categoryIds.filter((id) => id !== categoryId),
    });
  };
  const patchIndexSeo = (updates: Partial<CollectionDefinition["seo"]>) => {
    if (!editingDefinition) return;
    patchEditingDefinition({
      seo: {
        ...editingDefinition.seo,
        ...updates,
        schemaType: "CollectionPage",
      },
    });
  };
  const togglePublicIndex = (checked: boolean) => {
    if (!editingDefinition) return;
    patchEditingDefinition({
      publicIndex: checked,
      seo: {
        ...editingDefinition.seo,
        title: editingDefinition.seo.title || editingDefinition.name,
        description: editingDefinition.seo.description || editingDefinition.description,
        schemaType: "CollectionPage",
      },
    });
  };
  const handleAddPreset = (preset: CollectionDefinition) => {
    const nextDefinitionId = onAddPreset(preset);
    setPresetPickerOpen(false);
    if (nextDefinitionId) setEditingId(nextDefinitionId);
  };
  const handleDeleteDefinition = (definition: CollectionDefinition) => {
    const entries = entryCount(definition.id);
    const entryCopy = entries === 1 ? "1 entry" : `${entries} entries`;
    const message = entries > 0
      ? `Delete "${definition.name}" and ${entryCopy}?`
      : `Delete "${definition.name}"?`;
    if (!window.confirm(message)) return;
    onDelete(definition.id);
    setEditingId(null);
  };
  const handleDeleteEditing = () => {
    if (!editingDefinition) return;
    handleDeleteDefinition(editingDefinition);
  };
  const builderSteps = editingDefinition
    ? [
        {
          label: "Model",
          description: editingDefinition.singularName,
          ok: isModelReady(editingDefinition),
        },
        {
          label: "Route",
          description: routeExample(editingDefinition),
          ok: isRouteReady(editingDefinition),
        },
        {
          label: "Index",
          description: editingDefinition.publicIndex ? indexPath(editingDefinition) : "Off",
          ok: isIndexSeoReady(editingDefinition),
        },
        {
          label: "Fields",
          description: `${editingDefinition.fields.length} custom`,
          ok: true,
        },
        {
          label: "Categories",
          description: availableCategoryCount(editingDefinition) > 0 ? `${availableCategoryCount(editingDefinition)} available` : "Optional",
          ok: true,
        },
      ]
    : [];
  const editingSafetyMessages = editingDefinition ? modelSafetyMessages(editingDefinition) : [];
  const fieldDraftKey = editingDefinition && fieldDraft
    ? makeUniqueFieldKey(fieldDraft.label || "New Field", editingDefinition.fields)
    : "";
  const currentEntryTemplateId = editingDefinition
    ? editingDefinition.entryTemplateId ?? getDefaultEntryTemplateId(editingDefinition)
    : "";
  const currentIndexTemplateId = editingDefinition
    ? editingDefinition.indexTemplateId ?? getDefaultCollectionTemplateId(editingDefinition)
    : "";

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">Content model builder</p>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.03em] text-slate-950">Repeatable content models</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add a model only when a site needs many pages with the same shape, like Blog posts, Cars, Tours, Products, or Team members.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPresetPickerOpen(true)}
                className="rounded-lg bg-slate-950 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-teal-700"
              >
                Add collection
              </button>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                Optional setup
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[12px] text-slate-600 md:grid-cols-3">
            <span><strong className="text-slate-900">Blog</strong> collection creates entries like <code className="font-mono text-[11px]">/blog/post/</code>.</span>
            <span><strong className="text-slate-900">Cars</strong> collection creates entries like <code className="font-mono text-[11px]">/cars/bmw-x5/</code>.</span>
            <span><strong className="text-slate-900">Categories</strong> are optional filters like Guides, SUVs, or Europe.</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">Index page</th>
                <th className="px-4 py-3">Entry route</th>
                <th className="px-4 py-3">Schema</th>
                <th className="px-4 py-3">Fields</th>
                <th className="px-4 py-3">Blocks</th>
                <th className="px-4 py-3">Entries</th>
                <th className="px-4 py-3">Filters</th>
                <th className="px-4 py-3">Setup</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {graph.collectionDefinitions.map((definition) => {
                const setupReady = modelSafetyMessages(definition).length === 0;

                return (
                  <tr key={definition.id} className="transition hover:bg-slate-50/70">
                    <td className="border-t border-slate-100 px-5 py-4">
                      <button
                        onClick={() => setEditingId(definition.id)}
                        className="block max-w-[280px] truncate text-left text-sm font-semibold text-slate-950"
                      >
                        {definition.name}
                      </button>
                      <p className="mt-1 max-w-[320px] truncate text-xs text-slate-500">{definition.description || "No description"}</p>
                    </td>
                    <td className="border-t border-slate-100 px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${definition.publicIndex ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                        {definition.publicIndex ? indexPath(definition) : "Off"}
                      </span>
                    </td>
                    <td className="border-t border-slate-100 px-4 py-4 font-mono text-xs text-slate-600">{routeExample(definition)}</td>
                    <td className="border-t border-slate-100 px-4 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {definition.schemaType}
                      </span>
                    </td>
                    <td className="border-t border-slate-100 px-4 py-4 text-slate-600">{definition.fields.length}</td>
                    <td className="border-t border-slate-100 px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${definition.hasBlocks ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                        {definition.hasBlocks ? "Enabled" : "Off"}
                      </span>
                    </td>
                    <td className="border-t border-slate-100 px-4 py-4 text-slate-600">{entryCount(definition.id)}</td>
                    <td className="border-t border-slate-100 px-4 py-4 text-slate-600">{availableCategoryCount(definition)}</td>
                    <td className="border-t border-slate-100 px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        setupReady
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {setupReady ? "Ready" : "Needs setup"}
                      </span>
                    </td>
                    <td className="border-t border-slate-100 px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          data-testid={`collection-edit-${definition.id}`}
                          onClick={() => setEditingId(definition.id)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDefinition(definition)}
                          className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {graph.collectionDefinitions.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                    No collections yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {presetPickerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm">
          <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-teal-700">New collection</p>
                <h3 className="mt-0.5 text-xl font-bold tracking-[-0.03em] text-slate-950">Choose a starting point</h3>
                <p className="mt-1 text-sm text-slate-500">Pick the closest model. You can change route, fields, categories, and SEO next.</p>
              </div>
              <button
                onClick={() => setPresetPickerOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-xl font-light text-slate-500 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
              >
                x
              </button>
            </div>
            <div className="min-h-0 overflow-auto bg-slate-50/70 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleAddPreset(preset)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{preset.schemaType} model</p>
                        <h4 className="mt-1 text-base font-bold text-slate-950">{preset.name}</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${preset.publicIndex ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                        {preset.publicIndex ? "Index on" : "Index off"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{preset.description}</p>
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-500">
                      {getCollectionPath(preset)}example-entry/
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingDefinition && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm">
          <div data-testid="collection-builder-modal" className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-teal-700">Content model builder</p>
                <h3 className="mt-0.5 text-xl font-bold tracking-[-0.03em] text-slate-950">{editingDefinition.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Define the content type, entry route, optional index page, fields, and category filters.
                </p>
              </div>
              <button
                onClick={() => setEditingId(null)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-xl font-light text-slate-500 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
              >
                x
              </button>
            </div>

            <div className="min-h-0 overflow-auto bg-slate-50/70 p-5">
              <div className="mb-4 grid gap-2 md:grid-cols-5">
                {builderSteps.map((step) => (
                  <div
                    key={step.label}
                    className={`rounded-xl border px-3 py-2 ${
                      step.ok ? "border-emerald-100 bg-emerald-50/70" : "border-amber-100 bg-amber-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${step.ok ? "text-emerald-700" : "text-amber-700"}`}>
                        {step.label}
                      </span>
                      <span className={`h-2 w-2 rounded-full ${step.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                    </div>
                    <p className="mt-1 truncate text-[11px] font-semibold text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>

              {editingSafetyMessages.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-700">Setup checks</p>
                  <div className="mt-2 grid gap-1.5">
                    {editingSafetyMessages.map((message) => (
                      <p key={message} className="text-sm font-medium text-amber-800">{message}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">1. Model</h4>
                      <p className="mt-1 text-xs text-slate-500">Name the repeated content type users will create.</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${isModelReady(editingDefinition) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {isModelReady(editingDefinition) ? "Ready" : "Required"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Field label="Name">
                      <TextInput value={editingDefinition.name} onChange={(event) => patchEditingDefinition({ name: event.target.value })} />
                    </Field>
                    <Field label="Singular Name">
                      <TextInput value={editingDefinition.singularName} onChange={(event) => patchEditingDefinition({ singularName: event.target.value })} />
                    </Field>
                    <Field label="Description">
                      <TextArea rows={4} value={editingDefinition.description} onChange={(event) => patchEditingDefinition({ description: event.target.value })} />
                    </Field>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">2. Route and index</h4>
                      <p className="mt-1 text-xs text-slate-500">The URL segment controls both entry URLs and the optional listing page.</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                      isRouteReady(editingDefinition) && isIndexSeoReady(editingDefinition) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {isRouteReady(editingDefinition) && isIndexSeoReady(editingDefinition) ? "Safe" : "Check"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Field label="Route Parent">
                      <select
                        className={selectChromeClass}
                        value={editingDefinition.routeParentId ?? ""}
                        onChange={(event) => patchEditingDefinition({ routeParentId: event.target.value || null })}
                      >
                        <option value="">No parent - root</option>
                        {graph.pages.map((page) => (
                          <option key={page.id} value={page.id}>{page.title}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="URL Segment">
                      <TextInput value={editingDefinition.slug} onChange={(event) => patchEditingDefinition({ slug: event.target.value })} />
                    </Field>
                    <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] font-semibold text-slate-700">
                      <input
                        className="h-4 w-4 accent-teal-600"
                        type="checkbox"
                        checked={editingDefinition.publicIndex}
                        onChange={(event) => togglePublicIndex(event.target.checked)}
                      />
                      Build collection index page
                    </label>
                    <div className="grid gap-2 rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-xs text-teal-800">
                      <p><strong>Entry route:</strong> every published entry gets its own page, like {routeExample(editingDefinition)}.</p>
                      <p><strong>Index page:</strong> turn this on only when you want a public listing page, like {indexPath(editingDefinition)}.</p>
                    </div>
                    <Field label="Index Page Route">
                      <div className={`rounded-lg border px-3 py-2 font-mono text-[12px] font-semibold ${editingDefinition.publicIndex ? "border-teal-100 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-50/70 text-slate-400"}`}>
                        {editingDefinition.publicIndex ? indexPath(editingDefinition) : "Off"}
                      </div>
                    </Field>
                    <Field label="Entry URL Example">
                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] font-semibold text-slate-500">
                        {routeExample(editingDefinition)}
                      </div>
                    </Field>
                    <Field label="Entry Template">
                      <select
                        className={selectChromeClass}
                        value={currentEntryTemplateId}
                        onChange={(event) => patchEditingDefinition({ entryTemplateId: event.target.value })}
                      >
                        {entryTemplateOptions.map((template) => (
                          <option key={template.id} value={template.id}>{template.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Index Template">
                      <select
                        className={selectChromeClass}
                        value={currentIndexTemplateId}
                        onChange={(event) => patchEditingDefinition({ indexTemplateId: event.target.value })}
                      >
                        {collectionTemplateOptions.map((template) => (
                          <option key={template.id} value={template.id}>{template.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Schema Type">
                      <select className={selectChromeClass} value={editingDefinition.schemaType} onChange={(event) => patchEditingDefinition({ schemaType: event.target.value as any })}>
                        <option value="Article">Article</option>
                        <option value="WebPage">WebPage</option>
                        <option value="Product">Product</option>
                        <option value="Person">Person</option>
                      </select>
                    </Field>
                    <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] font-semibold text-slate-700">
                      <input
                        className="h-4 w-4 accent-teal-600"
                        type="checkbox"
                        checked={editingDefinition.hasBlocks}
                        onChange={(event) => patchEditingDefinition({ hasBlocks: event.target.checked })}
                      />
                      Entries use blocks
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">3. Index page SEO</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Required only when the collection index page is enabled. Entries keep their own SEO in the editor.
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${editingDefinition.publicIndex ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                      {editingDefinition.publicIndex ? indexPath(editingDefinition) : "Index off"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field label="SEO Title">
                      <TextInput value={editingDefinition.seo.title} onChange={(event) => patchIndexSeo({ title: event.target.value })} />
                    </Field>
                    <Field label="OG Image">
                      <TextInput value={editingDefinition.seo.ogImage ?? ""} onChange={(event) => patchIndexSeo({ ogImage: event.target.value })} />
                    </Field>
                    <Field label="SEO Description">
                      <TextArea rows={4} value={editingDefinition.seo.description} onChange={(event) => patchIndexSeo({ description: event.target.value })} />
                    </Field>
                    <Field label="Robots">
                      <select className={selectChromeClass} value={editingDefinition.seo.robots ?? "index,follow"} onChange={(event) => patchIndexSeo({ robots: event.target.value as any })}>
                        <option value="index,follow">index, follow</option>
                        <option value="noindex,follow">noindex, follow</option>
                        <option value="noindex,nofollow">noindex, nofollow</option>
                      </select>
                    </Field>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">4. Entry fields</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Add only fields every entry should share. Use blocks for page layout and marketing content.
                      </p>
                    </div>
                    <button
                      onClick={() => setFieldDraft({ label: "", type: "text", required: false })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                    >
                      Add field
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {editingDefinition.fields.map((field) => (
                      <div key={field.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-[minmax(0,1fr)_170px_150px_auto_auto] md:items-center">
                        <Field label="Label">
                          <TextInput value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} placeholder="Field label" />
                        </Field>
                        <Field label="Stable key">
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] font-semibold text-slate-500">
                            {field.id}
                          </div>
                        </Field>
                        <select className={selectChromeClass} value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })}>
                          {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                          <input className="h-4 w-4 accent-teal-600" type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} />
                          Required
                        </label>
                        <button onClick={() => removeField(field.id)} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:bg-rose-50">
                          Remove
                        </button>
                      </div>
                    ))}
                    {editingDefinition.fields.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-medium text-slate-500">
                        No custom fields.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">5. Category behavior</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Categories are optional. Select filters editors can assign to this collection, or leave all unchecked to keep it open.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {availableCategoryCount(editingDefinition)} available
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {graph.categories.map((category) => {
                      const categoryLockedToThisCollection = category.collectionIds.includes(editingDefinition.id);
                      const categoryLockedToAnotherCollection =
                        category.collectionIds.length > 0 && !category.collectionIds.includes(editingDefinition.id);
                      const enabled = isCategoryEnabled(editingDefinition, category);

                      return (
                        <label
                          key={category.id}
                          className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition ${
                            enabled
                              ? "border-teal-100 bg-teal-50/70"
                              : categoryLockedToAnotherCollection
                                ? "border-slate-100 bg-slate-50/60 opacity-60"
                                : "border-slate-200 bg-slate-50/70"
                          }`}
                        >
                          <input
                            className="mt-1 h-4 w-4 accent-teal-600"
                            type="checkbox"
                            checked={enabled}
                            disabled={categoryLockedToThisCollection || categoryLockedToAnotherCollection}
                            onChange={(event) => patchCategoryAllowance(category.id, event.target.checked)}
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-800">{category.name}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {categoryLockedToAnotherCollection
                                ? "Locked to another collection."
                                : categoryLockedToThisCollection
                                  ? "Locked from the category settings."
                                : category.publicIndex
                                  ? `Can create ${getCategoryPath(category)}`
                                  : "Private filter only."}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                    {graph.categories.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-medium text-slate-500 md:col-span-2">
                        No categories yet. Add categories only when entries need filters or topic pages.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
              <button
                onClick={handleDeleteEditing}
                className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              >
                Delete collection
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg bg-slate-950 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </div>
          {fieldDraft && (
            <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm">
              <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">Entry field</p>
                    <h3 className="mt-0.5 text-xl font-bold tracking-[-0.03em] text-slate-950">Add field</h3>
                    <p className="mt-1 text-sm text-slate-500">Use fields for structured data every entry should share.</p>
                  </div>
                  <button
                    onClick={() => setFieldDraft(null)}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-xl font-light text-slate-500 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
                  >
                    x
                  </button>
                </div>
                <div className="grid gap-4 bg-slate-50/70 p-5">
                  <Field label="Label">
                    <TextInput
                      value={fieldDraft.label}
                      onChange={(event) => setFieldDraft({ ...fieldDraft, label: event.target.value })}
                      placeholder="Featured image, Price, Location..."
                    />
                  </Field>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Type">
                      <select
                        className={selectChromeClass}
                        value={fieldDraft.type}
                        onChange={(event) => setFieldDraft({ ...fieldDraft, type: event.target.value as FieldType })}
                      >
                        {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </Field>
                    <Field label="Stable JSON key">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-600">
                        {fieldDraftKey}
                      </div>
                    </Field>
                  </div>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
                    <input
                      className="mt-0.5 h-4 w-4 accent-teal-600"
                      type="checkbox"
                      checked={fieldDraft.required}
                      onChange={(event) => setFieldDraft({ ...fieldDraft, required: event.target.checked })}
                    />
                    <span>
                      Required field
                      <span className="mt-0.5 block text-xs font-medium text-slate-500">
                        Existing entries must fill this before publishing cleanly.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
                  <button
                    onClick={() => setFieldDraft(null)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addField}
                    disabled={!fieldDraft.label.trim()}
                    className="rounded-lg bg-slate-950 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add field
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function CategoryDirectory({
  graph,
  onAdd,
  onPatch,
  onDelete,
}: {
  graph: ContentGraph;
  onAdd: () => string | void;
  onPatch: (categoryId: string, updates: Partial<Category>) => void;
  onDelete: (categoryId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingCategory = graph.categories.find((category) => category.id === editingId) ?? null;
  const categoryTemplateOptions = templatesForRoute("category");
  const currentCategoryTemplateId = editingCategory?.indexTemplateId ?? "category-index";
  const patchEditingCategory = (updates: Partial<Category>) => {
    if (!editingCategory) return;
    onPatch(editingCategory.id, updates);
  };
  const categoryEntryCount = (categoryId: string) =>
    graph.entries.filter((entry) => entry.categoryIds.includes(categoryId)).length;
  const collectionLabels = (category: Category) =>
    category.collectionIds
      .map((collectionId) => graph.collectionDefinitions.find((definition) => definition.id === collectionId)?.name)
      .filter(Boolean)
      .join(", ") || "All collections";
  const publicPath = (category: Category) => `/category/${category.slug}/`;
  const handleAdd = () => {
    const nextCategoryId = onAdd();
    if (nextCategoryId) setEditingId(nextCategoryId);
  };
  const handleDeleteCategory = (category: Category) => {
    const entries = categoryEntryCount(category.id);
    const copy = entries > 0
      ? `Delete "${category.name}" and remove it from ${entries === 1 ? "1 entry" : `${entries} entries`}?`
      : `Delete "${category.name}"?`;
    if (!window.confirm(copy)) return;
    onDelete(category.id);
    setEditingId(null);
  };
  const handleDeleteEditing = () => {
    if (!editingCategory) return;
    handleDeleteCategory(editingCategory);
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.03em] text-slate-950">Category filters</h2>
            <p className="mt-1 text-sm text-slate-500">
              Optional groups inside collections. Examples: Blog Guides, Car SUVs, Tour Europe.
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-teal-700"
          >
            Add category
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Public page</th>
                <th className="px-4 py-3">Collections</th>
                <th className="px-4 py-3">Entries</th>
                <th className="px-4 py-3">SEO</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {graph.categories.map((category) => {
                const seoReady = Boolean(category.seo.title && category.seo.description);

                return (
                  <tr key={category.id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                    <td className="border-t border-slate-100 px-5 py-4">
                      <button
                        onClick={() => setEditingId(category.id)}
                        className="block max-w-[280px] text-left text-sm font-semibold text-slate-950"
                      >
                        {category.name}
                      </button>
                      <p className="mt-1 max-w-[320px] truncate text-xs text-slate-500">{category.description || "No description"}</p>
                    </td>
                    <td className="border-t border-slate-100 px-4 py-4 font-mono text-xs text-slate-600">{category.slug}</td>
                    <td className="border-t border-slate-100 px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${category.publicIndex ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                        {category.publicIndex ? publicPath(category) : "Filter only"}
                      </span>
                    </td>
                    <td className="border-t border-slate-100 px-4 py-4 text-slate-600">{collectionLabels(category)}</td>
                    <td className="border-t border-slate-100 px-4 py-4 text-slate-600">{categoryEntryCount(category.id)}</td>
                    <td className="border-t border-slate-100 px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${seoReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {seoReady ? "Ready" : "Needs SEO"}
                      </span>
                    </td>
                    <td className="border-t border-slate-100 px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(category.id)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {graph.categories.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                    No categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingCategory && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-teal-700">Category</p>
                <h3 className="mt-0.5 text-xl font-bold tracking-[-0.03em] text-slate-950">{editingCategory.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Keep private for editor filtering, or publish a listing page when the topic deserves search traffic.
                </p>
              </div>
              <button
                onClick={() => setEditingId(null)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-xl font-light text-slate-500 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
              >
                x
              </button>
            </div>

            <div className="min-h-0 overflow-auto bg-slate-50/70 p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <h4 className="text-sm font-semibold text-slate-800">Basics</h4>
                  <div className="mt-3 grid gap-3">
                    <Field label="Name">
                      <TextInput value={editingCategory.name} onChange={(event) => patchEditingCategory({ name: event.target.value, seo: { ...editingCategory.seo, title: event.target.value } })} />
                    </Field>
                    <Field label="Slug">
                      <TextInput value={editingCategory.slug} onChange={(event) => patchEditingCategory({ slug: event.target.value })} />
                    </Field>
                    <Field label="Description">
                      <TextArea rows={4} value={editingCategory.description} onChange={(event) => patchEditingCategory({ description: event.target.value, seo: { ...editingCategory.seo, description: event.target.value } })} />
                    </Field>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <h4 className="text-sm font-semibold text-slate-800">Publishing</h4>
                  <div className="mt-3 grid gap-3">
                    <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] font-semibold text-slate-700">
                      <input
                        className="h-4 w-4 accent-teal-600"
                        type="checkbox"
                        checked={editingCategory.publicIndex}
                        onChange={(event) => patchEditingCategory({ publicIndex: event.target.checked })}
                      />
                      Build public category page
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] font-medium text-slate-600">
                      {editingCategory.publicIndex ? publicPath(editingCategory) : "Private category"}
                    </div>
                    <Field label="Category Template">
                      <select
                        className={selectChromeClass}
                        value={currentCategoryTemplateId}
                        onChange={(event) => patchEditingCategory({ indexTemplateId: event.target.value })}
                      >
                        {categoryTemplateOptions.map((template) => (
                          <option key={template.id} value={template.id}>{template.label}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-xs leading-5 text-teal-800">
                      Example: a Blog collection with a Guides category can keep Guides private for filtering, or publish a page like {publicPath(editingCategory)}.
                    </div>
                    <div className="grid gap-2">
                      <p className="text-[12px] font-semibold text-slate-700">Included collections</p>
                      <div className="flex flex-wrap gap-2">
                        {graph.collectionDefinitions.map((definition) => (
                          <label key={definition.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                            <input
                              className="accent-teal-600"
                              type="checkbox"
                              checked={editingCategory.collectionIds.includes(definition.id)}
                              onChange={(event) =>
                                patchEditingCategory({
                                  collectionIds: event.target.checked
                                    ? [...editingCategory.collectionIds, definition.id]
                                    : editingCategory.collectionIds.filter((id) => id !== definition.id),
                                })
                              }
                            />
                            {definition.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
                  <h4 className="text-sm font-semibold text-slate-800">SEO</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field label="SEO Title">
                      <TextInput value={editingCategory.seo.title} onChange={(event) => patchEditingCategory({ seo: { ...editingCategory.seo, title: event.target.value } })} />
                    </Field>
                    <Field label="OG Image">
                      <TextInput value={editingCategory.seo.ogImage ?? ""} onChange={(event) => patchEditingCategory({ seo: { ...editingCategory.seo, ogImage: event.target.value } })} />
                    </Field>
                    <Field label="SEO Description">
                      <TextArea rows={4} value={editingCategory.seo.description} onChange={(event) => patchEditingCategory({ seo: { ...editingCategory.seo, description: event.target.value } })} />
                    </Field>
                    <Field label="Robots">
                      <select className={selectChromeClass} value={editingCategory.seo.robots ?? "index,follow"} onChange={(event) => patchEditingCategory({ seo: { ...editingCategory.seo, robots: event.target.value as any } })}>
                        <option value="index,follow">index, follow</option>
                        <option value="noindex,follow">noindex, follow</option>
                        <option value="noindex,nofollow">noindex, nofollow</option>
                      </select>
                    </Field>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
              <button
                onClick={handleDeleteEditing}
                className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              >
                Delete category
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg bg-slate-950 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MediaLibraryPanel({
  graph,
  checkUrl,
  onUpload,
  onReplace,
  onPatch,
  onDelete,
}: {
  graph: ContentGraph;
  checkUrl: string;
  onUpload: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onReplace: (assetId: string, file: File) => Promise<AssetMeta | null>;
  onPatch: (assetId: string, updates: Partial<AssetMeta>) => void;
  onDelete: (assetId: string) => Promise<void>;
}) {
  return (
    <MediaLibraryManager
      graph={graph}
      checkUrl={checkUrl}
      onUpload={onUpload}
      onReplace={onReplace}
      onPatch={onPatch}
      onDelete={onDelete}
    />
  );
}

const nestedBlockDefinitions = blockDefinitions.filter((definition) =>
  definition.type !== BlockType.SHARED_BLOCK && definition.type !== BlockType.TWO_COLUMN
);

const sharedTwoColumnDefaults = [
  { id: "left", label: "Left column", blocks: [] as BlockData[] },
  { id: "right", label: "Right column", blocks: [] as BlockData[] },
];

const normalizeSharedTwoColumnColumns = (content: Record<string, any>) => {
  const columns = Array.isArray(content?.columns) ? content.columns : [];

  return sharedTwoColumnDefaults.map((fallback, index) => {
    const column = columns[index] && typeof columns[index] === "object" ? columns[index] : {};
    return {
      ...fallback,
      ...column,
      blocks: Array.isArray(column.blocks) ? column.blocks : [],
    };
  });
};

function SharedTwoColumnFields({
  block,
  onPatch,
  assets,
  onUploadAsset,
  onFocusField,
  activeFieldPath,
}: {
  block: BlockData;
  onPatch: (updater: (block: BlockData) => void) => void;
  assets: AssetMeta[];
  onUploadAsset: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
}) {
  const columns = normalizeSharedTwoColumnColumns(block.content ?? {});
  const patchContent = (updater: (content: Record<string, any>) => void) => {
    onPatch((draft) => {
      const content = {
        layout: draft.content?.layout ?? "50-50",
        gap: draft.content?.gap ?? "lg",
        padding: draft.content?.padding ?? "lg",
        columns: normalizeSharedTwoColumnColumns(draft.content ?? {}),
      };

      updater(content);
      draft.content = content;
    });
  };
  const patchNestedBlock = (columnIndex: number, nestedBlockId: string, updater: (block: BlockData) => void) => {
    patchContent((content) => {
      const nextColumns = normalizeSharedTwoColumnColumns(content);
      const nestedBlock = nextColumns[columnIndex].blocks.find((candidate) => candidate.id === nestedBlockId);
      if (!nestedBlock) return;
      updater(nestedBlock);
      content.columns = nextColumns;
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["50-50", "50 / 50"],
          ["60-40", "60 / 40"],
          ["40-60", "40 / 60"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => patchContent((content) => { content.layout = value; })}
            className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
              block.content?.layout === value || (!block.content?.layout && value === "50-50")
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Gap">
          <select className={selectChromeClass} value={block.content?.gap ?? "lg"} onChange={(event) => patchContent((content) => { content.gap = event.target.value; })}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </Field>
        <Field label="Padding">
          <select className={selectChromeClass} value={block.content?.padding ?? "lg"} onChange={(event) => patchContent((content) => { content.padding = event.target.value; })}>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        </Field>
      </div>
      {columns.map((column, columnIndex) => (
        <div key={column.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold text-slate-950">{column.label}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{column.blocks.length} block{column.blocks.length === 1 ? "" : "s"}</p>
            </div>
            <select
              className={`${selectChromeClass} max-w-[132px] bg-white`}
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                const type = event.target.value as BlockType;
                patchContent((content) => {
                  const nextColumns = normalizeSharedTwoColumnColumns(content);
                  nextColumns[columnIndex].blocks = [
                    ...nextColumns[columnIndex].blocks,
                    { id: createId("nested-block"), type, content: cloneDefaultBlockContent(type) },
                  ];
                  content.columns = nextColumns;
                });
                event.target.value = "";
              }}
            >
              <option value="">Add block</option>
              {nestedBlockDefinitions.map((definition) => (
                <option key={definition.type} value={definition.type}>{definition.label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2.5">
            {column.blocks.map((nestedBlock) => (
              <div key={nestedBlock.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold text-slate-950">{blockLabels[nestedBlock.type] ?? nestedBlock.type}</p>
                  <button
                    onClick={() => patchContent((content) => {
                      const nextColumns = normalizeSharedTwoColumnColumns(content);
                      nextColumns[columnIndex].blocks = nextColumns[columnIndex].blocks.filter((candidate) => candidate.id !== nestedBlock.id);
                      content.columns = nextColumns;
                    })}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase text-rose-700"
                  >
                    Remove
                  </button>
                </div>
                <BlockManualFields
                  block={nestedBlock}
                  onPatch={(updater) => patchNestedBlock(columnIndex, nestedBlock.id, updater)}
                  assets={assets}
                  onUploadAsset={onUploadAsset}
                  onFocusField={onFocusField}
                  activeFieldPath={activeFieldPath}
                  fieldPathPrefix={nestedBlockFieldPrefix(column.id, nestedBlock.id)}
                />
              </div>
            ))}
            {column.blocks.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs font-semibold text-slate-500">
                Add a block to this column.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SharedBlockDirectory({
  graph,
  focusedRequest,
  onAdd,
  onPatch,
  onDelete,
  onUploadAsset,
  onBackToEditor,
  backToEditorLabel,
}: {
  graph: ContentGraph;
  focusedRequest?: { id: string; path?: string; requestId: number } | null;
  onAdd: () => string | void;
  onPatch: (sharedBlockId: string, updater: (sharedBlock: SharedBlock) => void) => void;
  onDelete: (sharedBlockId: string) => void;
  onUploadAsset: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onBackToEditor?: () => void;
  backToEditorLabel?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(graph.sharedBlocks[0]?.id ?? null);
  const [activeFieldPath, setActiveFieldPath] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editingSharedBlock = graph.sharedBlocks.find((sharedBlock) => sharedBlock.id === editingId) ?? null;

  useEffect(() => {
    if (focusedRequest && graph.sharedBlocks.some((sharedBlock) => sharedBlock.id === focusedRequest.id)) {
      setEditingId(focusedRequest.id);
      setActiveFieldPath(focusedRequest.path ?? null);
    }
  }, [focusedRequest]);

  useEffect(() => {
    if (!focusedRequest?.path || editingId !== focusedRequest.id) return;

    let cancelled = false;
    let attempts = 0;
    let frameId = 0;

    const revealField = () => {
      if (cancelled) return;

      const target = Array.from(
        editorRef.current?.querySelectorAll<HTMLElement>("[data-cms-editor-field]") ?? [],
      ).find((element) => element.dataset.cmsEditorField === focusedRequest.path);

      if (!target && attempts < 12) {
        attempts += 1;
        frameId = window.requestAnimationFrame(revealField);
        return;
      }

      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      frameId = window.requestAnimationFrame(() => {
        const focusTarget = target.querySelector<HTMLElement>(
          "input:not([type='hidden']), textarea, select, [contenteditable='true'], button",
        );
        focusTarget?.focus({ preventScroll: true });
      });
    };

    frameId = window.requestAnimationFrame(revealField);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [editingId, focusedRequest]);

  const selectForEditing = (sharedBlockId: string) => {
    setEditingId(sharedBlockId);
    setActiveFieldPath(null);
  };

  const usageCount = (sharedBlockId: string) =>
    [...graph.pages, ...graph.entries].reduce(
      (count, item) => count + item.blocks.filter((block) => block.type === BlockType.SHARED_BLOCK && block.content?.refId === sharedBlockId).length,
      0,
    );

  const handleAdd = () => {
    const nextId = onAdd();
    if (nextId) setEditingId(nextId);
  };

  const handleDelete = (sharedBlock: SharedBlock) => {
    if (usageCount(sharedBlock.id) > 0) {
      window.alert("This shared block is still used on one or more pages. Remove those references before deleting it.");
      return;
    }

    if (!window.confirm(`Delete "${sharedBlock.name}"?`)) return;
    onDelete(sharedBlock.id);
    setEditingId(null);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.03em] text-slate-950">Shared blocks</h2>
            <p className="mt-1 text-sm text-slate-500">Reusable content sections linked across pages.</p>
          </div>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-teal-700"
          >
            Add shared
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">Block</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {graph.sharedBlocks.map((sharedBlock) => (
                <tr key={sharedBlock.id} className="transition hover:bg-slate-50/70">
                  <td className="border-t border-slate-100 px-5 py-4">
                    <button
                      onClick={() => selectForEditing(sharedBlock.id)}
                      className="block max-w-[280px] truncate text-left text-sm font-semibold text-slate-950"
                    >
                      {sharedBlock.name}
                    </button>
                    <p className="mt-1 text-xs text-slate-500">Updated {new Date(sharedBlock.updatedAt).toLocaleDateString()}</p>
                  </td>
                  <td className="border-t border-slate-100 px-4 py-4 text-slate-600">{blockLabels[sharedBlock.block.type]}</td>
                  <td className="border-t border-slate-100 px-4 py-4 text-slate-600">{usageCount(sharedBlock.id)}</td>
                  <td className="border-t border-slate-100 px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => selectForEditing(sharedBlock.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(sharedBlock)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {graph.sharedBlocks.length === 0 && (
                <tr>
                  <td colSpan={4} className="border-t border-slate-100 px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    No shared blocks yet. Save a page block as shared or add a default shared CTA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={editorRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {editingSharedBlock ? (
          <div className="space-y-4">
            {onBackToEditor && (
              <button
                type="button"
                onClick={onBackToEditor}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-teal-700"
              >
                <span aria-hidden="true">←</span>
                Back to {backToEditorLabel || "page editor"}
              </button>
            )}
            <div>
              <p className="text-xs font-semibold text-teal-700">Shared block</p>
              <h3 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950">{editingSharedBlock.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{blockLabels[editingSharedBlock.block.type]} reused in {usageCount(editingSharedBlock.id)} place(s).</p>
            </div>
            <Field label="Name">
              <TextInput
                value={editingSharedBlock.name}
                onChange={(event) => onPatch(editingSharedBlock.id, (draft) => { draft.name = event.target.value; })}
              />
            </Field>
            <Field label="Type">
              <select
                className={selectChromeClass}
                value={editingSharedBlock.block.type}
                onChange={(event) => {
                  const nextType = event.target.value as BlockType;
                  onPatch(editingSharedBlock.id, (draft) => {
                    if (draft.block.type === nextType) return;
                    draft.block = {
                      id: createId("block"),
                      type: nextType,
                      content: cloneDefaultBlockContent(nextType),
                    };
                  });
                }}
              >
                {blockDefinitions.filter((definition) => definition.type !== BlockType.SHARED_BLOCK).map((definition) => (
                  <option key={definition.type} value={definition.type}>{definition.label}</option>
                ))}
              </select>
            </Field>
            {editingSharedBlock.block.type === BlockType.TWO_COLUMN ? (
              <SharedTwoColumnFields
                block={editingSharedBlock.block}
                onPatch={(updater) => onPatch(editingSharedBlock.id, (draft) => {
                  updater(draft.block);
                })}
                assets={graph.assets}
                onUploadAsset={onUploadAsset}
                onFocusField={setActiveFieldPath}
                activeFieldPath={activeFieldPath}
              />
            ) : (
              <BlockManualFields
                block={editingSharedBlock.block}
                onPatch={(updater) => onPatch(editingSharedBlock.id, (draft) => {
                  updater(draft.block);
                })}
                assets={graph.assets}
                onUploadAsset={onUploadAsset}
                onFocusField={setActiveFieldPath}
                activeFieldPath={activeFieldPath}
              />
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">
            Choose a shared block to edit.
          </div>
        )}
      </div>
    </div>
  );
}

export function NavigationEditor({
  graph,
  onChange,
  compact = false,
  focusLocation,
}: {
  graph: ContentGraph;
  onChange: (navigation: NavigationMenu[]) => void;
  compact?: boolean;
  focusLocation?: NavigationMenu["location"];
}) {
  const headerMenus = graph.navigation.filter((menu) => menu.location === "header");
  const footerMenus = graph.navigation.filter((menu) => menu.location === "footer");
  const visibleMenus = focusLocation ? graph.navigation.filter((menu) => menu.location === focusLocation) : graph.navigation;
  const focusLabel = focusLocation === "header" ? "Header" : focusLocation === "footer" ? "Footer" : "";

  const updateMenu = (menuId: string, updater: (menu: NavigationMenu) => void) => {
    onChange(graph.navigation.map((menu) => {
      if (menu.id !== menuId) return menu;
      const next = clone(menu);
      updater(next);
      return next;
    }));
  };

  const addMenu = (location: NavigationMenu["location"]) => {
    onChange([
      ...graph.navigation,
      { id: createId("nav"), name: location === "header" ? "Header" : "Footer", location, items: [] },
    ]);
  };

  const removeMenu = (menuId: string) => {
    onChange(graph.navigation.filter((menu) => menu.id !== menuId));
  };

  return (
    <div className={compact ? "space-y-4" : "grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.58fr)]"}>
      {!focusLocation && (
        <div className={compact ? "grid gap-4 md:grid-cols-2" : "space-y-5 xl:order-2 xl:sticky xl:top-8 xl:self-start"}>
          <NavigationPreview title="Header preview" location="header" menus={headerMenus} graph={graph} compact={compact} />
          <NavigationPreview title="Footer preview" location="footer" menus={footerMenus} graph={graph} compact={compact} />
        </div>
      )}

      <div className="space-y-4">
        {(!compact || visibleMenus.length === 0) && <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!compact && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">Navigation builder</p>
                <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950">Header, footer, and dropdowns</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Add child links under a top-level item for a dropdown; add children under those links for a mega-menu column.
                </p>
              </div>
            )}
            {compact && (
              <p className="text-sm font-semibold text-slate-600">
                {focusLocation ? `${focusLabel} links and dropdowns.` : "Add links, dropdowns, and footer groups."}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {(!focusLocation || focusLocation === "header") && headerMenus.length === 0 && (
                <button data-testid="navigation-add-header-menu" onClick={() => addMenu("header")} className="rounded-lg bg-slate-950 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-teal-700">
                  Add header
                </button>
              )}
              {(!focusLocation || focusLocation === "footer") && footerMenus.length === 0 && (
                <button data-testid="navigation-add-footer-menu" onClick={() => addMenu("footer")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
                  Add footer
                </button>
              )}
            </div>
          </div>
        </div>}

        {visibleMenus.map((menu) => (
          <div key={menu.id} className={`overflow-hidden border border-slate-200 bg-white ${compact ? "rounded-xl" : "rounded-2xl shadow-sm"}`}>
            <div className={`border-b border-slate-200 bg-slate-50/80 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
              {compact && <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">General</p>}
              <div className={`grid gap-3 ${focusLocation ? "" : "md:grid-cols-[minmax(0,1fr)_170px_auto] md:items-end"}`}>
                <Field label="Menu name">
                  <TextInput value={menu.name} onChange={(event) => updateMenu(menu.id, (draft) => { draft.name = event.target.value; })} />
                </Field>
                <Field label="Placement">
                  {focusLocation ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      {focusLabel}
                    </div>
                  ) : (
                    <select className={selectChromeClass} value={menu.location} onChange={(event) => updateMenu(menu.id, (draft) => { draft.location = event.target.value as any; })}>
                      <option value="header">Header</option>
                      <option value="footer">Footer</option>
                    </select>
                  )}
                </Field>
                {!focusLocation && (
                  <button onClick={() => removeMenu(menu.id)} className="rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:bg-rose-50">
                    Remove menu
                  </button>
                )}
              </div>
            </div>

            <div className={`grid gap-2.5 ${compact ? "p-3" : "p-4"}`}>
              {compact && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Navigation links</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{menu.items.length}</span>
                </div>
              )}
              {menu.items.map((item, index) => (
                <NavigationItemEditor
                  key={item.id}
                  item={item}
                  graph={graph}
                  depth={0}
                  index={index}
                  total={menu.items.length}
                  stacked={Boolean(focusLocation)}
                  onChange={(nextItem) => updateMenu(menu.id, (draft) => { draft.items[index] = nextItem; })}
                  onRemove={() => updateMenu(menu.id, (draft) => { draft.items = draft.items.filter((candidate) => candidate.id !== item.id); })}
                  onMove={(direction) => updateMenu(menu.id, (draft) => {
                    const nextIndex = index + direction;
                    if (nextIndex < 0 || nextIndex >= draft.items.length) return;
                    const [moved] = draft.items.splice(index, 1);
                    draft.items.splice(nextIndex, 0, moved);
                  })}
                />
              ))}
              <button
                data-testid="navigation-add-top-level-link"
                onClick={() => updateMenu(menu.id, (draft) => {
                  draft.items.push(createNavigationItem(graph));
                })}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
              >
                Add top-level link
              </button>
              {menu.items.length === 0 && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  This menu has no links yet.
                </p>
              )}
              {focusLocation && (
                <div className="mt-1 border-t border-slate-200 pt-3">
                  <button onClick={() => removeMenu(menu.id)} className="text-[10px] font-bold uppercase tracking-[0.08em] text-rose-600 transition hover:text-rose-800">
                    Remove {focusLabel.toLowerCase()} menu
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {visibleMenus.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="text-lg font-bold text-slate-950">No {focusLocation ? focusLabel.toLowerCase() : ""} menu yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              {focusLocation ? `Create a ${focusLabel.toLowerCase()} menu to control this global component.` : "Create a header or footer menu to control public navigation."}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

const navigationTargetTypes: Array<{ value: NavigationItem["targetType"]; label: string }> = [
  { value: "page", label: "Page" },
  { value: "entry", label: "Entry" },
  { value: "collection", label: "Collection" },
  { value: "category", label: "Category" },
  { value: "url", label: "URL" },
];

const getNavigationTargetOptions = (graph: ContentGraph, targetType: NavigationItem["targetType"]) =>
  targetType === "page"
    ? graph.pages.map((page) => ({ id: page.id, label: page.title }))
    : targetType === "entry"
      ? graph.entries.map((entry) => ({ id: entry.id, label: entry.title }))
      : targetType === "collection"
        ? graph.collectionDefinitions.map((definition) => ({ id: definition.id, label: definition.name }))
        : targetType === "category"
          ? graph.categories.map((category) => ({ id: category.id, label: category.name }))
          : [];

const createNavigationItem = (graph: ContentGraph, label = "New Link"): NavigationItem => {
  const targetId = graph.pages[0]?.id;

  return {
    id: createId("nav-item"),
    label,
    targetType: "page",
    targetId,
  };
};

function NavigationItemEditor({
  item,
  graph,
  depth,
  index,
  total,
  stacked = false,
  onChange,
  onRemove,
  onMove,
}: {
  item: NavigationItem;
  graph: ContentGraph;
  depth: number;
  index: number;
  total: number;
  stacked?: boolean;
  onChange: (item: NavigationItem) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const children = item.children ?? [];
  const targetOptions = getNavigationTargetOptions(graph, item.targetType);
  const canNest = depth < 2;
  const childCopy = depth === 0 ? "dropdown item" : "nested item";
  const changeTargetType = (targetType: NavigationItem["targetType"]) => {
    const nextItem: NavigationItem = {
      ...item,
      targetType,
      targetId: undefined,
      href: undefined,
    };

    if (targetType === "url") {
      nextItem.href = item.href || "/";
    } else {
      nextItem.targetId = getNavigationTargetOptions(graph, targetType)[0]?.id;
    }

    onChange(nextItem);
  };
  const updateChild = (childIndex: number, nextChild: NavigationItem) => {
    onChange({
      ...item,
      children: children.map((child, currentIndex) => currentIndex === childIndex ? nextChild : child),
    });
  };
  const removeChild = (childId: string) => {
    const nextChildren = children.filter((child) => child.id !== childId);
    onChange({
      ...item,
      children: nextChildren.length > 0 ? nextChildren : undefined,
    });
  };
  const moveChild = (childIndex: number, direction: -1 | 1) => {
    const nextIndex = childIndex + direction;
    if (nextIndex < 0 || nextIndex >= children.length) return;
    const nextChildren = [...children];
    const [moved] = nextChildren.splice(childIndex, 1);
    nextChildren.splice(nextIndex, 0, moved);
    onChange({ ...item, children: nextChildren });
  };

  return (
    <div className={`group rounded-lg border ${stacked ? "p-2.5" : "p-3"} ${depth === 0 ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50/80"}`}>
      <div className={`grid gap-3 ${stacked ? "" : "lg:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_auto] lg:items-end"}`}>
        <Field label={depth === 0 ? "Link label" : "Child label"}>
          <TextInput data-testid="navigation-item-label" value={item.label} onChange={(event) => onChange({ ...item, label: event.target.value })} placeholder="Menu label" />
        </Field>
        <Field label="Target type">
          <select data-testid="navigation-item-target-type" className={selectChromeClass} value={item.targetType} onChange={(event) => changeTargetType(event.target.value as NavigationItem["targetType"])}>
            {navigationTargetTypes.map((targetType) => (
              <option key={targetType.value} value={targetType.value}>{targetType.label}</option>
            ))}
          </select>
        </Field>
        <Field label={item.targetType === "url" ? "URL" : "Target"}>
          {item.targetType === "url" ? (
            <TextInput data-testid="navigation-item-url" value={item.href ?? ""} onChange={(event) => onChange({ ...item, href: event.target.value })} placeholder="/path" />
          ) : (
            <select data-testid="navigation-item-target" className={selectChromeClass} value={item.targetId ?? ""} onChange={(event) => onChange({ ...item, targetId: event.target.value })}>
              <option value="">Choose target</option>
              {targetOptions.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}
            </select>
          )}
        </Field>
        <div className={`flex flex-wrap gap-1.5 transition ${stacked ? "justify-start sm:opacity-60 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" : "justify-end"}`}>
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 disabled:opacity-40"
          >
            Up
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index >= total - 1}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 disabled:opacity-40"
          >
            Down
          </button>
          <button onClick={onRemove} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700 transition hover:bg-rose-100">
            Remove
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {children.length > 0 && (
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700">
            {depth === 0 ? "Dropdown" : "Mega column"}
          </span>
        )}
        {canNest && (
          <button
            onClick={() => onChange({ ...item, children: [...children, createNavigationItem(graph, depth === 0 ? "Dropdown Link" : "Nested Link")] })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
          >
            Add {childCopy}
          </button>
        )}
        {depth === 0 && children.some((child) => child.children?.length) && (
          <span className="text-xs font-semibold text-slate-500">Nested children render as a mega menu.</span>
        )}
      </div>

      {children.length > 0 && (
        <div className="mt-3 grid gap-3 border-l-2 border-violet-100 pl-3">
          {children.map((child, childIndex) => (
            <NavigationItemEditor
              key={child.id}
              item={child}
              graph={graph}
              depth={depth + 1}
              index={childIndex}
              total={children.length}
              stacked={stacked}
              onChange={(nextChild) => updateChild(childIndex, nextChild)}
              onRemove={() => removeChild(child.id)}
              onMove={(direction) => moveChild(childIndex, direction)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavigationPreview({
  title,
  location,
  menus,
  graph,
  compact = false,
}: {
  title: string;
  location: NavigationMenu["location"];
  menus: NavigationMenu[];
  graph: ContentGraph;
  compact?: boolean;
}) {
  const items = menus.flatMap((menu) => menu.items);

  return (
    <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">Rendered preview</p>
          <h3 className="mt-0.5 text-base font-bold tracking-[-0.03em] text-slate-950">{title}</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {items.length} links
        </span>
      </div>

      {location === "header" ? (
        <div className="overflow-visible rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <div className={`flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm ${compact ? "overflow-x-auto" : ""}`}>
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-xs text-white">B</span>
              {graph.site.siteName}
            </div>
            <div className="flex min-w-max items-center gap-1.5">
              {items.map((item) => <PreviewHeaderItem key={item.id} item={item} graph={graph} />)}
              {items.length === 0 && <span className="text-xs font-semibold text-slate-400">No header links</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white">
          <div className="mb-3">
            <strong className="text-sm">{graph.site.siteName}</strong>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{graph.site.defaultDescription}</p>
          </div>
          <div className={`grid gap-2.5 ${compact ? "" : "sm:grid-cols-2"}`}>
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <a className="text-xs font-bold uppercase tracking-[0.08em] text-white" href={resolveNavigationHref(item, graph)}>{item.label}</a>
                {item.children && item.children.length > 0 && (
                  <div className="mt-2 grid gap-1.5">
                    {item.children.map((child) => (
                      <a key={child.id} className="text-xs font-semibold text-slate-300" href={resolveNavigationHref(child, graph)}>{child.label}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && <span className="text-xs font-semibold text-slate-400">No footer links</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewHeaderItem({ item, graph }: { item: NavigationItem; graph: ContentGraph }) {
  const children = item.children ?? [];

  return (
    <div className="group relative">
      <a className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href={resolveNavigationHref(item, graph)}>
        {item.label}
        {children.length > 0 && <span className="text-violet-600">v</span>}
      </a>
      {children.length > 0 && (
        <div className="absolute right-0 top-full z-20 hidden min-w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 group-hover:grid group-focus-within:grid">
          <div className={`grid gap-2 ${children.some((child) => child.children?.length) ? "sm:grid-cols-2" : ""}`}>
            {children.map((child) => (
              <div key={child.id} className="rounded-lg bg-slate-50 p-3">
                <a className="text-xs font-bold text-slate-950" href={resolveNavigationHref(child, graph)}>{child.label}</a>
                {child.children && child.children.length > 0 && (
                  <div className="mt-2 grid gap-1.5">
                    {child.children.map((grandchild) => (
                      <a key={grandchild.id} className="text-xs font-semibold text-slate-500" href={resolveNavigationHref(grandchild, graph)}>{grandchild.label}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RedirectEditor({
  redirects,
  onChange,
}: {
  redirects: RedirectRule[];
  onChange: (redirects: RedirectRule[]) => void;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.05em]">Redirects</h2>
          <p className="mt-2 text-sm text-slate-500">Manage old URLs and campaign redirects.</p>
        </div>
        <button
          onClick={() => onChange([...redirects, { id: createId("redirect"), from: "/old-path/", to: "/", status: 301 }])}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white"
        >
          Add Redirect
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {redirects.map((redirect, index) => (
          <div key={redirect.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_120px_auto]">
            <TextInput value={redirect.from} onChange={(event) => onChange(redirects.map((item, itemIndex) => itemIndex === index ? { ...item, from: event.target.value } : item))} placeholder="/old-url/" />
            <TextInput value={redirect.to} onChange={(event) => onChange(redirects.map((item, itemIndex) => itemIndex === index ? { ...item, to: event.target.value } : item))} placeholder="/new-url/" />
            <select className={selectChromeClass} value={redirect.status} onChange={(event) => onChange(redirects.map((item, itemIndex) => itemIndex === index ? { ...item, status: Number(event.target.value) as 301 | 302 } : item))}>
              <option value={301}>301</option>
              <option value={302}>302</option>
            </select>
            <button onClick={() => onChange(redirects.filter((item) => item.id !== redirect.id))} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600">Remove</button>
          </div>
        ))}
        {redirects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
            No redirects yet.
          </div>
        )}
      </div>
    </div>
  );
}

export function JsonPanel({
  title,
  description,
  value,
  error,
  onChange,
  onApply,
}: {
  title: string;
  description: string;
  value: string;
  error: string;
  onChange: (value: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <h2 className="text-2xl font-black tracking-[-0.05em]">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <TextArea rows={18} value={value} onChange={(event) => onChange(event.target.value)} className="mt-5 font-mono" />
      <div className="mt-3 flex items-center gap-3">
        <button onClick={onApply} className="rounded-2xl bg-slate-950 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white">Apply JSON</button>
        {error && <span className="text-sm font-bold text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
