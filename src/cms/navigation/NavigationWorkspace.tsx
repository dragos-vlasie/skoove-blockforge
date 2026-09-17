import { useEffect, useMemo, useRef, useState } from "react";
import { BlockRenderer } from "../../../components/BlockLibrary";
import type { ContentGraph, NavigationItem, NavigationMenu } from "../../../types";
import { createId } from "../contentUtils";
import { EditorNavigationSurface, getNavigationItemsForLocation } from "../editor/EditorNavigationSurface";
import { type PreviewDevice } from "../editor/CanvasToolbar";
import { PreviewFrame, type PreviewFrameHandle } from "../editor/PreviewFrame";
import { SvgIcon } from "../icons";
import { Field, selectChromeClass, TextInput } from "../ui";
import { createSemanticThemeStyle } from "../../themes/semanticTokens";
import { getConfiguredLocales, getContentLocale } from "../../localization/registry";

type Location = NavigationMenu["location"];

const deviceWidths: Record<PreviewDevice, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

const targetTypes: Array<{ value: NavigationItem["targetType"]; label: string }> = [
  { value: "page", label: "Page" },
  { value: "entry", label: "Entry" },
  { value: "collection", label: "Collection" },
  { value: "category", label: "Category" },
  { value: "url", label: "External or custom URL" },
];

const targetOptions = (graph: ContentGraph, targetType: NavigationItem["targetType"], locale: string) =>
  targetType === "page"
    ? graph.pages.filter((page) => getContentLocale(page, graph.site) === locale).map((page) => ({ id: page.id, label: page.title }))
    : targetType === "entry"
      ? graph.entries.filter((entry) => getContentLocale(entry, graph.site) === locale).map((entry) => ({ id: entry.id, label: entry.title }))
      : targetType === "collection"
        ? graph.collectionDefinitions.filter((definition) => getContentLocale(definition, graph.site) === locale).map((definition) => ({ id: definition.id, label: definition.name }))
        : targetType === "category"
          ? graph.categories.filter((category) => getContentLocale(category, graph.site) === locale).map((category) => ({ id: category.id, label: category.name }))
          : [];

const createItem = (graph: ContentGraph, locale: string, label = "New link"): NavigationItem => ({
  id: createId("nav-item"),
  label,
  targetType: "page",
  targetId: targetOptions(graph, "page", locale)[0]?.id,
});

const findItem = (items: NavigationItem[], itemId: string): NavigationItem | null => {
  for (const item of items) {
    if (item.id === itemId) return item;
    const nested = findItem(item.children ?? [], itemId);
    if (nested) return nested;
  }
  return null;
};

const updateItem = (
  items: NavigationItem[],
  itemId: string,
  updater: (item: NavigationItem) => NavigationItem,
): NavigationItem[] =>
  items.map((item) => {
    if (item.id === itemId) return updater(item);
    if (!item.children?.length) return item;
    return { ...item, children: updateItem(item.children, itemId, updater) };
  });

const removeItem = (items: NavigationItem[], itemId: string): NavigationItem[] =>
  items
    .filter((item) => item.id !== itemId)
    .map((item) => item.children?.length ? { ...item, children: removeItem(item.children, itemId) } : item);

const moveItem = (items: NavigationItem[], itemId: string, direction: -1 | 1): NavigationItem[] => {
  const index = items.findIndex((item) => item.id === itemId);
  if (index >= 0) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    return next;
  }

  return items.map((item) =>
    item.children?.length ? { ...item, children: moveItem(item.children, itemId, direction) } : item,
  );
};

const reorderItemBefore = (items: NavigationItem[], draggedId: string, targetId: string): NavigationItem[] => {
  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (draggedIndex >= 0 && targetIndex >= 0) {
    if (draggedIndex === targetIndex) return items;
    const next = [...items];
    const [dragged] = next.splice(draggedIndex, 1);
    const insertionIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(insertionIndex, 0, dragged);
    return next;
  }

  return items.map((item) =>
    item.children?.length
      ? { ...item, children: reorderItemBefore(item.children, draggedId, targetId) }
      : item,
  );
};

const siblingPosition = (items: NavigationItem[], itemId: string): { index: number; total: number } | null => {
  const index = items.findIndex((item) => item.id === itemId);
  if (index >= 0) return { index, total: items.length };
  for (const item of items) {
    const nested = siblingPosition(item.children ?? [], itemId);
    if (nested) return nested;
  }
  return null;
};

function NavigationTree({
  items,
  selectedItemId,
  depth = 0,
  onSelect,
  draggingItemId,
  onDragStart,
  onDrop,
}: {
  items: NavigationItem[];
  selectedItemId: string | null;
  depth?: number;
  onSelect: (itemId: string) => void;
  draggingItemId: string | null;
  onDragStart: (itemId: string | null) => void;
  onDrop: (targetItemId: string) => void;
}) {
  return (
    <div className="grid gap-1">
      {items.map((item) => (
        <div key={item.id}>
          <button
            type="button"
            draggable
            onDragStart={() => onDragStart(item.id)}
            onDragEnd={() => onDragStart(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              onDrop(item.id);
            }}
            onClick={() => onSelect(item.id)}
            aria-current={selectedItemId === item.id ? "true" : undefined}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg pr-2 text-left text-sm transition ${
              selectedItemId === item.id
                ? "bg-[#ece9ff] text-[#4f3fe0]"
                : "text-[#475467] hover:bg-[#f2f4f7] hover:text-[#172033]"
            } ${draggingItemId === item.id ? "opacity-45" : ""}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <SvgIcon name="grip" className="h-4 w-4 shrink-0 text-[#98a2b3]" />
            <span className="min-w-0 flex-1 truncate font-medium">{item.label || "Untitled link"}</span>
            {item.children?.length ? (
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] text-[#667085]">{item.children.length}</span>
            ) : null}
          </button>
          {item.children?.length ? (
            <NavigationTree
              items={item.children}
              selectedItemId={selectedItemId}
              depth={depth + 1}
              onSelect={onSelect}
              draggingItemId={draggingItemId}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function NavigationWorkspace({
  graph,
  onChange,
}: {
  graph: ContentGraph;
  onChange: (navigation: NavigationMenu[]) => void;
}) {
  const [location, setLocation] = useState<Location>("header");
  const [locale, setLocale] = useState(graph.site.defaultLocale);
  const locales = getConfiguredLocales(graph.site);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    () => getNavigationItemsForLocation(graph, "header")[0]?.id ?? null,
  );
  const [device, setDevice] = useState<PreviewDevice>(() => {
    if (typeof window === "undefined") return "desktop";
    if (window.matchMedia("(max-width: 639px)").matches) return "mobile";
    if (window.matchMedia("(max-width: 1023px)").matches) return "tablet";
    return "desktop";
  });
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const previewRegionRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<PreviewFrameHandle>(null);

  const menus = graph.navigation.filter(
    (menu) => menu.location === location && getContentLocale(menu, graph.site) === locale,
  );
  const items = getNavigationItemsForLocation(graph, location, locale);
  const activeMenu = menus.find((menu) => findItem(menu.items, selectedItemId ?? "")) ?? menus[0] ?? null;
  const selectedItem = selectedItemId
    ? findItem(activeMenu?.items ?? items, selectedItemId)
    : null;
  const position = selectedItemId ? siblingPosition(activeMenu?.items ?? [], selectedItemId) : null;
  const previewWidth = deviceWidths[device];
  const previewScale = viewportWidth > 0
    ? Math.min(1, Math.max(0.25, (viewportWidth - 32) / previewWidth))
    : 1;
  const homePage = graph.pages.find(
    (page) => (page.slug === "/" || page.slug === "" || page.slug === "home") && getContentLocale(page, graph.site) === locale,
  ) ?? graph.pages.find((page) => getContentLocale(page, graph.site) === locale) ?? null;
  const previewThemeStyle = useMemo(
    () => createSemanticThemeStyle(graph.site),
    [graph.site.design],
  );

  useEffect(() => {
    const region = previewRegionRef.current;
    if (!region) return;
    const update = () => setViewportWidth(region.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selectedItemId && items.some((item) => Boolean(findItem([item], selectedItemId)))) return;
    setSelectedItemId(items[0]?.id ?? null);
  }, [items, selectedItemId]);

  useEffect(() => {
    previewFrameRef.current?.scrollToElement("data-cms-preview-global", location);
  }, [location]);

  const updateMenu = (menuId: string, updater: (menu: NavigationMenu) => NavigationMenu) => {
    onChange(graph.navigation.map((menu) => menu.id === menuId ? updater(menu) : menu));
  };

  const ensureMenu = () => {
    if (activeMenu) return activeMenu;
    return {
      id: createId("nav"),
      name: location === "header" ? "Header" : "Footer",
      location,
      locale,
      translationGroupId: `navigation-${location}`,
      items: [],
    } satisfies NavigationMenu;
  };

  const addTopLevel = () => {
    const menu = ensureMenu();
    const item = createItem(graph, locale);
    if (graph.navigation.some((candidate) => candidate.id === menu.id)) {
      updateMenu(menu.id, (draft) => ({ ...draft, items: [...draft.items, item] }));
    } else {
      onChange([...graph.navigation, { ...menu, items: [item] }]);
    }
    setSelectedItemId(item.id);
  };

  const patchSelected = (updater: (item: NavigationItem) => NavigationItem) => {
    if (!activeMenu || !selectedItemId) return;
    updateMenu(activeMenu.id, (menu) => ({ ...menu, items: updateItem(menu.items, selectedItemId, updater) }));
  };

  const selectLocation = (nextLocation: Location) => {
    setLocation(nextLocation);
    setSelectedItemId(getNavigationItemsForLocation(graph, nextLocation, locale)[0]?.id ?? null);
  };

  const selectPreviewItem = (itemId: string) => {
    setSelectedItemId(itemId);
    previewFrameRef.current?.scrollToElement("data-navigation-item", itemId);
  };

  const changeTargetType = (targetType: NavigationItem["targetType"]) => {
    if (!selectedItem) return;
    const options = targetOptions(graph, targetType, locale);
    patchSelected((item) => ({
      ...item,
      targetType,
      targetId: targetType === "url" ? undefined : options[0]?.id,
      href: targetType === "url" ? item.href || "/" : undefined,
    }));
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#dfe3e8] bg-white xl:h-[calc(100dvh-238px)] xl:min-h-[650px]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7ec] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">Navigation workspace</h2>
          <p className="mt-0.5 text-xs text-[#667085]">Select a link in the tree or directly on the website preview.</p>
        </div>
        <div className="flex items-center gap-2">
          {locales.length > 1 && (
            <select
              aria-label="Navigation language"
              value={locale}
              onChange={(event) => {
                const nextLocale = event.target.value;
                setLocale(nextLocale);
                setSelectedItemId(getNavigationItemsForLocation(graph, location, nextLocale)[0]?.id ?? null);
              }}
              className="h-9 rounded-lg border border-[#e4e7ec] bg-white px-2 text-xs font-medium text-[#475467]"
            >
              {locales.map((configuredLocale) => <option key={configuredLocale.code} value={configuredLocale.code}>{configuredLocale.label}</option>)}
            </select>
          )}
          <div className="flex rounded-lg border border-[#e4e7ec] bg-[#f8fafc] p-0.5">
            {(["desktop", "tablet", "mobile"] as PreviewDevice[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} preview`}
                aria-pressed={device === value}
                onClick={() => setDevice(value)}
                className={`grid h-8 min-w-9 place-items-center rounded-md px-2 text-xs font-medium capitalize transition ${
                  device === value ? "bg-white text-[#4f3fe0] shadow-sm" : "text-[#667085]"
                }`}
              >
                <SvgIcon name={value === "mobile" ? "mobile" : "desktop"} className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button type="button" onClick={addTopLevel} className="h-9 rounded-lg bg-[#6d5dfc] px-3 text-sm font-medium text-white hover:bg-[#5947e8]">
            Add link
          </button>
        </div>
      </header>

      <div className="grid min-h-0 xl:h-[calc(100%-65px)] xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="order-2 max-h-[340px] overflow-y-auto border-b border-[#e4e7ec] bg-[#fbfcfd] p-3 xl:order-1 xl:max-h-none xl:border-b-0 xl:border-r">
          <div className="grid grid-cols-2 rounded-lg border border-[#e4e7ec] bg-white p-1">
            {(["header", "footer"] as Location[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => selectLocation(value)}
                aria-pressed={location === value}
                className={`h-9 rounded-md text-sm font-medium capitalize transition ${
                  location === value ? "bg-[#ece9ff] text-[#4f3fe0]" : "text-[#667085] hover:bg-[#f8fafc]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-medium text-[#667085]">{location === "header" ? "Header links" : "Footer links"}</span>
              <span className="text-xs text-[#98a2b3]">{items.length}</span>
            </div>
            <NavigationTree
              items={items}
              selectedItemId={selectedItemId}
              onSelect={selectPreviewItem}
              draggingItemId={draggingItemId}
              onDragStart={setDraggingItemId}
              onDrop={(targetItemId) => {
                if (!activeMenu || !draggingItemId || draggingItemId === targetItemId) return;
                updateMenu(activeMenu.id, (menu) => ({
                  ...menu,
                  items: reorderItemBefore(menu.items, draggingItemId, targetItemId),
                }));
                setDraggingItemId(null);
              }}
            />
            {items.length === 0 && (
              <button type="button" onClick={addTopLevel} className="w-full rounded-lg border border-dashed border-[#c8ced8] p-4 text-sm text-[#667085] hover:border-[#a99bff] hover:text-[#4f3fe0]">
                Add the first {location} link
              </button>
            )}
          </div>
        </aside>

        <div ref={previewRegionRef} className="order-1 h-[calc(100dvh-220px)] min-h-[620px] min-w-0 overflow-auto bg-white xl:order-2 xl:h-full xl:min-h-0">
          <div
            className="flex h-full min-h-[420px] justify-center"
            style={{ minWidth: `${previewWidth * previewScale}px` }}
          >
            <PreviewFrame
              ref={previewFrameRef}
              label={`${graph.site.siteName} navigation preview`}
              width={previewWidth}
              scale={previewScale}
              themeDesign={graph.site.design}
              themeStyle={previewThemeStyle}
              themeId={graph.site.design?.themeId}
            >
              <EditorNavigationSurface
                graph={graph}
                location="header"
                items={getNavigationItemsForLocation(graph, "header", locale)}
                active={location === "header"}
                selectedItemId={location === "header" ? selectedItemId : null}
                onSelect={() => selectLocation("header")}
                onSelectItem={(itemId) => {
                  setLocation("header");
                  selectPreviewItem(itemId);
                }}
              />
              <main className="transition-opacity" style={{ opacity: 0.58 }} aria-label={`${homePage?.title ?? "Website"} preview`}>
                {homePage?.blocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    sharedBlocks={graph.sharedBlocks}
                    graph={graph}
                    subject={homePage}
                  />
                ))}
                {!homePage && <div className="grid min-h-[420px] place-items-center bg-white text-sm text-slate-500">No page available for preview.</div>}
              </main>
              <EditorNavigationSurface
                graph={graph}
                location="footer"
                items={getNavigationItemsForLocation(graph, "footer", locale)}
                active={location === "footer"}
                selectedItemId={location === "footer" ? selectedItemId : null}
                onSelect={() => selectLocation("footer")}
                onSelectItem={(itemId) => {
                  setLocation("footer");
                  selectPreviewItem(itemId);
                }}
              />
            </PreviewFrame>
          </div>
        </div>

        <aside className="order-3 border-t border-[#e4e7ec] bg-white p-4 xl:overflow-y-auto xl:border-l xl:border-t-0">
          {selectedItem && activeMenu ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-[#6d5dfc]">{location === "header" ? "Header link" : "Footer link"}</p>
                <h3 className="mt-1 truncate text-lg font-semibold text-[#101828]">{selectedItem.label || "Untitled link"}</h3>
              </div>
              <Field label="Link label">
                <TextInput value={selectedItem.label} onChange={(event) => patchSelected((item) => ({ ...item, label: event.target.value }))} />
              </Field>
              <Field label="Destination type">
                <select className={selectChromeClass} value={selectedItem.targetType} onChange={(event) => changeTargetType(event.target.value as NavigationItem["targetType"])}>
                  {targetTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </Field>
              <Field label={selectedItem.targetType === "url" ? "URL" : "Destination"}>
                {selectedItem.targetType === "url" ? (
                  <TextInput value={selectedItem.href ?? ""} onChange={(event) => patchSelected((item) => ({ ...item, href: event.target.value }))} placeholder="/path or https://…" />
                ) : (
                  <select className={selectChromeClass} value={selectedItem.targetId ?? ""} onChange={(event) => patchSelected((item) => ({ ...item, targetId: event.target.value }))}>
                    <option value="">Choose destination</option>
                    {targetOptions(graph, selectedItem.targetType, locale).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!position || position.index === 0}
                  onClick={() => updateMenu(activeMenu.id, (menu) => ({ ...menu, items: moveItem(menu.items, selectedItem.id, -1) }))}
                  className="h-10 rounded-lg border border-[#d9dee7] text-sm font-medium text-[#475467] disabled:opacity-40"
                >
                  Move up
                </button>
                <button
                  type="button"
                  disabled={!position || position.index >= position.total - 1}
                  onClick={() => updateMenu(activeMenu.id, (menu) => ({ ...menu, items: moveItem(menu.items, selectedItem.id, 1) }))}
                  className="h-10 rounded-lg border border-[#d9dee7] text-sm font-medium text-[#475467] disabled:opacity-40"
                >
                  Move down
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const child = createItem(graph, "Dropdown link");
                  patchSelected((item) => ({ ...item, children: [...(item.children ?? []), child] }));
                  setSelectedItemId(child.id);
                }}
                className="h-10 w-full rounded-lg border border-[#c7b8ff] bg-[#f8f7ff] text-sm font-medium text-[#4f3fe0]"
              >
                Add dropdown item
              </button>
              <div className="border-t border-[#e4e7ec] pt-5">
                <button
                  type="button"
                  onClick={() => {
                    updateMenu(activeMenu.id, (menu) => ({ ...menu, items: removeItem(menu.items, selectedItem.id) }));
                    setSelectedItemId(null);
                  }}
                  className="h-10 w-full rounded-lg border border-rose-200 bg-rose-50 text-sm font-medium text-rose-700 hover:bg-rose-100"
                >
                  Remove link
                </button>
              </div>
            </div>
          ) : activeMenu ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-[#6d5dfc]">{location === "header" ? "Header" : "Footer"}</p>
                <h3 className="mt-1 text-lg font-semibold text-[#101828]">Menu settings</h3>
                <p className="mt-1 text-sm leading-6 text-[#667085]">Select a link in the tree or preview to edit it.</p>
              </div>
              <Field label="Menu name">
                <TextInput value={activeMenu.name} onChange={(event) => updateMenu(activeMenu.id, (menu) => ({ ...menu, name: event.target.value }))} />
              </Field>
              <button type="button" onClick={addTopLevel} className="h-10 w-full rounded-lg bg-[#6d5dfc] text-sm font-medium text-white">Add link</button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#c8ced8] p-5 text-center">
              <h3 className="text-sm font-semibold text-[#101828]">No {location} menu yet</h3>
              <button type="button" onClick={addTopLevel} className="mt-4 h-10 rounded-lg bg-[#6d5dfc] px-4 text-sm font-medium text-white">Create menu</button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
