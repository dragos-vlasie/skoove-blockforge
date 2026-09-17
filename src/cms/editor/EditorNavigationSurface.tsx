import type { ContentGraph, NavigationItem } from "../../../types";
import type { GlobalComponentId } from "./types";
import { getContentLocale } from "../../localization/registry";

const getAutoHeaderItems = (graph: ContentGraph, locale: string): NavigationItem[] =>
  graph.pages
    .filter(
      (page) =>
        page.status === "published" &&
        page.showInNavigation &&
        getContentLocale(page, graph.site).toLowerCase() === locale.toLowerCase(),
    )
    .sort((a, b) => a.order - b.order)
    .map((page) => ({
      id: `auto-${page.id}`,
      label: page.navigationLabel || page.title,
      targetType: "page",
      targetId: page.id,
    }));

export const getNavigationItemsForLocation = (
  graph: ContentGraph,
  location: GlobalComponentId,
  locale = graph.site.defaultLocale,
) => {
  const explicitItems = graph.navigation
    .filter(
      (menu) =>
        menu.location === location &&
        getContentLocale(menu, graph.site).toLowerCase() === locale.toLowerCase(),
    )
    .flatMap((menu) => menu.items ?? []);

  return location === "header" && explicitItems.length === 0 ? getAutoHeaderItems(graph, locale) : explicitItems;
};

export function EditorNavigationSurface({
  graph,
  location,
  items,
  active,
  onSelect,
  selectedItemId = null,
  onSelectItem,
}: {
  graph: ContentGraph;
  location: GlobalComponentId;
  items: NavigationItem[];
  active: boolean;
  onSelect: () => void;
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string) => void;
}) {
  const isHeader = location === "header";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${isHeader ? "Header" : "Footer"} navigation`}
      onClick={(event) => {
        event.preventDefault();
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      data-cms-preview-global={location}
      className={`cms-navigation-surface relative min-w-0 cursor-pointer outline-none transition ${
        active
          ? "z-[1] outline outline-2 outline-offset-[-2px] outline-[var(--accent,#6d5dfc)]"
          : "hover:outline hover:outline-1 hover:outline-offset-[-1px] hover:outline-[var(--accent,#6d5dfc)]"
      }`}
    >
      {isHeader ? (
        <div className="cms-navigation-header flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-8 py-4">
          <div className="cms-navigation-brand flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent,#6d5dfc)] text-sm font-black text-white">B</span>
            <span className="cms-navigation-brand-name truncate text-base font-black tracking-[-0.03em] text-slate-950">{graph.site.siteName}</span>
          </div>
          <div className="cms-navigation-links flex min-w-0 items-center justify-end gap-2">
            {items.slice(0, 6).map((item) => (
              <button
                type="button"
                key={item.id}
                data-navigation-item={item.id}
                onClick={(event) => {
                  if (!onSelectItem) return;
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectItem(item.id);
                }}
                className={`max-w-[150px] truncate rounded-lg px-2.5 py-2 text-[11px] text-slate-700 outline-none transition ${
                  selectedItemId === item.id ? "ring-2 ring-[var(--accent,#6d5dfc)] ring-offset-2" : ""
                } font-black uppercase tracking-[0.08em]`}
              >
                {item.label}
              </button>
            ))}
            {items.length === 0 && <span className="text-xs font-bold text-slate-400">No header links</span>}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 border-t border-slate-800 bg-slate-950 px-8 py-8 text-white sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="text-base font-black tracking-[-0.03em]">{graph.site.siteName}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">{graph.site.defaultDescription}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.slice(0, 4).map((item) => (
              <div
                key={item.id}
                data-navigation-item={item.id}
                className={`rounded-xl border bg-white/5 p-3 transition ${
                  selectedItemId === item.id ? "border-[var(--accent,#6d5dfc)] ring-2 ring-[var(--accent,#6d5dfc)]" : "border-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    if (!onSelectItem) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectItem(item.id);
                  }}
                  className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-white"
                >
                  {item.label}
                </button>
                {item.children && item.children.length > 0 && (
                  <div className="mt-2 grid gap-1">
                    {item.children.slice(0, 3).map((child) => (
                      <button
                        type="button"
                        key={child.id}
                        data-navigation-item={child.id}
                        onClick={(event) => {
                          if (!onSelectItem) return;
                          event.preventDefault();
                          event.stopPropagation();
                          onSelectItem(child.id);
                        }}
                        className={`rounded px-1 py-0.5 text-left text-xs font-semibold text-slate-300 ${
                          selectedItemId === child.id ? "bg-white/15 text-white ring-1 ring-white/60" : ""
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && <span className="text-xs font-bold text-slate-400">No footer links</span>}
          </div>
        </div>
      )}
    </div>
  );
}
