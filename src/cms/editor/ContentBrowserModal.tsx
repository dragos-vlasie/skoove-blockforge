import { useState } from "react";
import { contentPath } from "../contentUtils";
import { statusTone } from "../constants";
import { CmsDialog } from "../primitives/CmsDialog";
import { TextInput } from "../ui";
import type { Selection } from "../types";
import type { CollectionDefinition, CollectionEntry, ContentGraph, PageContent } from "../../../types";

type ContentBrowserItem = {
  kind: Selection["kind"];
  item: PageContent | CollectionEntry;
  meta: string;
  definition: CollectionDefinition | null | undefined;
};

export function ContentBrowserModal({
  open,
  graph,
  currentItem,
  onSelect,
  onClose,
}: {
  open: boolean;
  graph: ContentGraph;
  currentItem: PageContent | CollectionEntry | null;
  onSelect: (selection: Selection) => void;
  onClose: () => void;
}) {
  const [contentSearch, setContentSearch] = useState("");
  const [contentKind, setContentKind] = useState<"all" | Selection["kind"]>("all");

  if (!open) return null;

  const contentItems: ContentBrowserItem[] = [
    ...graph.pages.map((page) => ({ kind: "page" as const, item: page, meta: "Page", definition: null })),
    ...graph.entries.map((entry) => {
      const entryDefinition = graph.collectionDefinitions.find((candidate) => candidate.id === entry.collectionId);
      return { kind: "entry" as const, item: entry, meta: entryDefinition?.singularName ?? "Entry", definition: entryDefinition };
    }),
  ];
  const normalizedContentSearch = contentSearch.trim().toLowerCase();
  const filteredContentItems = contentItems.filter(({ kind, item, meta, definition }) => {
    if (contentKind !== "all" && kind !== contentKind) return false;
    if (!normalizedContentSearch) return true;

    return [
      item.title,
      item.slug,
      meta,
      definition?.name,
      contentPath(item, graph, definition),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedContentSearch));
  });

  return (
    <CmsDialog
      open={open}
      onClose={onClose}
      eyebrow="Content Library"
      title="Find content to edit"
      description={`${contentItems.length} pages and entries`}
      maxWidthClassName="sm:max-w-4xl"
      bodyClassName="p-0 sm:p-0"
    >
      <div className="sticky top-0 z-[1] border-b border-slate-200 bg-white p-4 sm:p-5">
          <div role="search" aria-label="Search CMS content" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <TextInput
              autoFocus
              aria-label="Search title, slug, type, or path"
              value={contentSearch}
              onChange={(event) => setContentSearch(event.target.value)}
              placeholder="Search title, slug, type, path..."
              className="bg-slate-50"
            />
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-50 p-1">
              {[
                ["all", "All"],
                ["page", "Pages"],
                ["entry", "Entries"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={contentKind === id}
                  onClick={() => setContentKind(id as "all" | Selection["kind"])}
                  className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest ${
                    contentKind === id ? "bg-white text-violet-600 shadow-sm" : "text-slate-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
      </div>
      <div className="p-4">
          <div className="grid gap-2">
            {filteredContentItems.map(({ kind, item: contentItem, meta, definition }) => (
              <button
                key={contentItem.id}
                type="button"
                aria-current={currentItem?.id === contentItem.id ? "true" : undefined}
                onClick={() => {
                  onSelect({ kind, id: contentItem.id });
                  onClose();
                }}
                className={`grid gap-3 rounded-2xl border px-4 py-3 text-left transition md:grid-cols-[minmax(0,1fr)_120px_90px] md:items-center ${
                  currentItem?.id === contentItem.id ? "border-violet-200 bg-violet-50" : "border-slate-100 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-950">{contentItem.title}</span>
                  <span className="mt-1 block truncate text-xs font-bold text-slate-400">{contentPath(contentItem, graph, definition)}</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{meta}</span>
                <span className={`justify-self-start rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest md:justify-self-end ${statusTone[contentItem.status]}`}>
                  {contentItem.status}
                </span>
              </button>
            ))}
            {filteredContentItems.length === 0 && (
              <div role="status" className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                No content matches this search.
              </div>
            )}
          </div>
      </div>
    </CmsDialog>
  );
}
