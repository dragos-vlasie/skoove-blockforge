import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { EditorRailButton, SvgIcon } from "./icons";
import { cmsControlBase, cmsFocusRing, cmsNavigationItems } from "./designSystem/foundation";
import type { CmsTab } from "./types";

export type CmsTopBarAction = {
  label: string;
  onClick: () => void;
  icon?: "desktop" | "plus";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  testId?: string;
};

export type CmsTopBarProps = {
  siteName: string;
  siteUrl?: string;
  message?: string;
  searchPlaceholder?: string;
  onOpenWebsiteSetup: () => void;
  actions?: CmsTopBarAction[];
  trailing?: ReactNode;
  onToggleNavigation?: () => void;
  navigationOpen?: boolean;
  onSearch?: () => void;
  searchShortcutLabel?: string;
};

export function CmsTopBar({
  siteName,
  siteUrl,
  message,
  searchPlaceholder = "Search pages, blocks, media, settings...",
  onOpenWebsiteSetup,
  actions = [],
  trailing,
  onToggleNavigation,
  navigationOpen = false,
  onSearch,
  searchShortcutLabel = "⌘ K",
}: CmsTopBarProps) {
  const displayName = siteName || "BlockForge";
  const displayUrl = siteUrl ? siteUrl.replace(/^https?:\/\//, "") : "blockforge.site";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#e4e7ec] bg-white px-2 sm:gap-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:max-w-[360px]">
        {onToggleNavigation && (
          <button
            type="button"
            onClick={onToggleNavigation}
            aria-label={navigationOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={navigationOpen}
            aria-controls="cms-mobile-navigation"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#667085] transition hover:bg-[#f8fafc] hover:text-[#172033] lg:hidden ${cmsFocusRing}`}
          >
            <SvgIcon name={navigationOpen ? "close" : "menu"} className="h-5 w-5" />
          </button>
        )}
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#6d5dfc] text-white shadow-[0_6px_16px_rgba(109,93,252,.2)]">
          <SvgIcon name="logo" className="h-5 w-5" />
        </div>
        <span className="hidden truncate text-sm font-bold tracking-[-0.02em] text-[#172033] xl:block">BlockForge</span>
        <span className="hidden h-6 w-px shrink-0 bg-[#e4e7ec] sm:block" />
        <div className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#172033] text-[10px] font-bold text-white sm:grid">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <button
          type="button"
          onClick={onOpenWebsiteSetup}
          className={`min-w-0 rounded-lg px-1.5 py-1 text-left transition hover:bg-[#f8fafc] ${cmsFocusRing}`}
        >
          <p className="truncate text-sm font-bold leading-4 text-[#172033]">{displayName}</p>
          <p className="hidden truncate text-xs font-medium leading-4 text-[#667085] sm:block">{displayUrl}</p>
        </button>
      </div>

      {onSearch && (
        <button
          type="button"
          onClick={onSearch}
          aria-label={searchPlaceholder}
          className={`mx-auto hidden h-10 min-w-0 max-w-[560px] flex-[1.4] items-center gap-2 rounded-lg border border-[#d9dee7] bg-[#f8fafc] px-3 text-left text-[#667085] transition hover:border-[#c7b8ff] hover:bg-white md:flex ${cmsFocusRing}`}
        >
          <SvgIcon name="search" className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{searchPlaceholder}</span>
          <span className="hidden rounded-md border border-[#d9dee7] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#667085] lg:block">
            {searchShortcutLabel}
          </span>
        </button>
      )}

      <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 md:flex-1 md:max-w-[360px]">
        {message && (
          <span className="hidden min-w-0 items-center gap-2 text-xs font-medium text-[#667085] 2xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="truncate">{message}</span>
          </span>
        )}
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            data-testid={action.testId}
            className={topBarActionClass(action.variant)}
          >
            {action.icon && <SvgIcon name={action.icon} className="h-4 w-4" />}
            <span className={action.variant === "primary" && action.icon ? "hidden sm:inline" : ""}>{action.label}</span>
          </button>
        ))}
        {trailing}
      </div>
    </header>
  );
}

function topBarActionClass(variant: CmsTopBarAction["variant"] = "secondary") {
  const base = `${cmsControlBase} gap-2 px-3 text-xs`;
  if (variant === "primary") return `${base} min-w-11 bg-[#6d5dfc] text-white shadow-sm hover:bg-[#5b4bea]`;
  if (variant === "danger") return `${base} hidden bg-rose-600 text-white hover:bg-rose-700 sm:inline-flex`;
  return `${base} hidden border border-[#d9dee7] bg-white text-[#172033] hover:border-[#c7b8ff] hover:text-[#6d5dfc] lg:inline-flex`;
}

export type CmsNavigationProps = {
  activeTab: CmsTab;
  onSetTab: (tab: CmsTab) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
};

export function CmsNavigation({
  activeTab,
  onSetTab,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  className = "",
  header,
  footer,
}: CmsNavigationProps) {
  const selectTab = (tab: CmsTab) => {
    onSetTab(tab);
    onNavigate?.();
  };

  return (
    <aside
      className={`flex h-full min-h-0 flex-col border-r border-[#e4e7ec] bg-white transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-56"
      } ${className}`}
      data-collapsed={collapsed ? "true" : "false"}
    >
      {header && <div className="border-b border-[#e4e7ec] p-3">{header}</div>}
      <nav aria-label="CMS navigation" className="grid gap-1 p-3">
        {cmsNavigationItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              data-testid={item.testId}
              className={`group flex min-h-11 items-center rounded-lg text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#6d5dfc] focus-visible:ring-offset-2 ${
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              } ${
                active
                  ? "bg-[#f2efff] text-[#6d5dfc]"
                  : "text-[#667085] hover:bg-[#f8fafc] hover:text-[#172033]"
              }`}
            >
              <SvgIcon name={item.icon} className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[#e4e7ec] p-2.5">
        {footer ?? (
          <form method="post" action="/api/cms/logout/">
            <button
              type="submit"
              className={`flex min-h-11 w-full items-center rounded-lg text-sm font-semibold text-[#667085] outline-none transition hover:bg-[#f8fafc] hover:text-[#172033] focus-visible:ring-2 focus-visible:ring-[#6d5dfc] focus-visible:ring-offset-2 ${
                collapsed ? "justify-center px-0" : "px-3"
              }`}
            >
              {collapsed ? "Out" : "Sign out"}
            </button>
          </form>
        )}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            className={`mt-1 flex min-h-11 w-full items-center rounded-lg text-[#667085] outline-none transition hover:bg-[#f8fafc] hover:text-[#172033] focus-visible:ring-2 focus-visible:ring-[#6d5dfc] focus-visible:ring-offset-2 ${
              collapsed ? "justify-center px-0" : "justify-between px-3"
            }`}
          >
            {!collapsed && <span className="text-sm font-semibold">Collapse</span>}
            <SvgIcon name={collapsed ? "chevronRight" : "chevronLeft"} className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

export type CmsMobileNavigationProps = Omit<CmsNavigationProps, "collapsed" | "onToggleCollapsed" | "className"> & {
  open: boolean;
  onClose: () => void;
  title?: string;
};

export function CmsMobileNavigation({
  open,
  onClose,
  title = "BlockForge CMS",
  ...navigationProps
}: CmsMobileNavigationProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#101828]/45 backdrop-blur-[2px] lg:hidden" />
        <DialogPrimitive.Content
          id="cms-mobile-navigation"
          className="fixed inset-y-0 left-0 z-50 h-full w-[min(88vw,320px)] bg-white shadow-2xl outline-none lg:hidden"
        >
          <DialogPrimitive.Title className="sr-only">CMS navigation</DialogPrimitive.Title>
          <CmsNavigation
            {...navigationProps}
            onNavigate={() => {
              navigationProps.onNavigate?.();
              onClose();
            }}
            header={navigationProps.header ?? (
              <div className="flex min-h-11 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#6d5dfc] text-white">
                    <SvgIcon name="logo" className="h-5 w-5" />
                  </span>
                  <span className="truncate text-sm font-bold text-[#172033]">{title}</span>
                </div>
                <DialogPrimitive.Close
                  type="button"
                  aria-label="Close navigation"
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#667085] transition hover:bg-[#f8fafc] hover:text-[#172033] ${cmsFocusRing}`}
                >
                  <SvgIcon name="close" className="h-5 w-5" />
                </DialogPrimitive.Close>
              </div>
            )}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type CmsRailProps = {
  activeTab: CmsTab;
  onSetTab: (tab: CmsTab) => void;
};

/** Compatibility rail. Prefer CmsNavigation for new shell integrations. */
export function CmsRail({ activeTab, onSetTab }: CmsRailProps) {
  return (
    <aside className="hidden border-r border-[#e4e7ec] bg-white lg:flex lg:flex-col lg:items-center lg:justify-between lg:py-3">
      <div className="grid gap-1.5">
        <a
          href="/cms/"
          aria-label="Client dashboard"
          title="Switch client"
          className={`mb-1 grid h-11 w-11 place-items-center rounded-lg bg-[#6d5dfc] text-sm font-black text-white shadow-sm transition hover:bg-[#5947e8] ${cmsFocusRing}`}
        >
          B
        </a>
        {cmsNavigationItems.map((item) => (
          <EditorRailButton
            key={item.id}
            active={activeTab === item.id}
            label={item.label}
            onClick={() => onSetTab(item.id)}
            icon={item.icon}
            testId={item.testId}
          />
        ))}
      </div>
      <form method="post" action="/api/cms/logout/">
        <button
          type="submit"
          className={`h-11 w-11 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#667085] transition hover:bg-[#f8fafc] hover:text-[#172033] ${cmsFocusRing}`}
        >
          Out
        </button>
      </form>
    </aside>
  );
}
