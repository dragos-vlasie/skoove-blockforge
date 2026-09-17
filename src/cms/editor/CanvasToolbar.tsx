import { SvgIcon } from "../icons";
import type { CollectionEntry, PageContent } from "../../../types";

export type PreviewDevice = "desktop" | "tablet" | "mobile";
export type PreviewZoom = "fit" | "100";

type CanvasToolbarProps = {
  item: PageContent | CollectionEntry | null;
  device: PreviewDevice;
  zoom: PreviewZoom;
  previewWidth: number;
  onSetDevice: (device: PreviewDevice) => void;
  onSetZoom: (zoom: PreviewZoom) => void;
  onOpenSections: () => void;
  onOpenProperties: () => void;
  sectionsOpen: boolean;
  propertiesOpen: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onOpenWebsiteSetup: () => void;
  onViewLive: () => void;
  onSave: () => void;
  onReview: () => void;
  onPublishPage?: () => void;
  isBusy: boolean;
  blockingIssues: number;
};

const previewDevices: Array<{
  id: PreviewDevice;
  label: string;
  icon: "desktop" | "mobile";
}> = [
  { id: "desktop", label: "Desktop preview", icon: "desktop" },
  { id: "tablet", label: "Tablet preview", icon: "desktop" },
  { id: "mobile", label: "Mobile preview", icon: "mobile" },
];

export function CanvasToolbar({
  item,
  device,
  zoom,
  previewWidth,
  onSetDevice,
  onSetZoom,
  onOpenSections,
  onOpenProperties,
  sectionsOpen,
  propertiesOpen,
  fullscreen,
  onToggleFullscreen,
  canNavigateBack,
  canNavigateForward,
  onNavigateBack,
  onNavigateForward,
  onOpenWebsiteSetup,
  onViewLive,
  onSave,
  onReview,
  onPublishPage,
  isBusy,
  blockingIssues,
}: CanvasToolbarProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 text-[12px]">
        <div className="hidden items-center rounded-lg border border-slate-200 bg-white p-0.5 sm:flex">
          <button
            type="button"
            onClick={onNavigateBack}
            disabled={!canNavigateBack}
            aria-label="Go back in editor history"
            title="Back"
            className="grid h-8 w-8 place-items-center rounded-md text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-violet-700 disabled:opacity-30"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onNavigateForward}
            disabled={!canNavigateForward}
            aria-label="Go forward in editor history"
            title="Forward"
            className="grid h-8 w-8 place-items-center rounded-md text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-violet-700 disabled:opacity-30"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenSections}
          aria-pressed={sectionsOpen}
          className="hidden min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-[#667085] shadow-sm transition hover:border-[#c7b8ff] hover:text-[#6247ff] sm:inline-flex lg:hidden"
        >
          Sections
        </button>
        <span className="hidden shrink-0 font-semibold text-[#667085] md:inline">Pages</span>
        <span className="hidden shrink-0 text-[#98a2b3] md:inline">›</span>
        <span className="min-w-0 truncate font-bold text-[#172033]">{item?.title ?? "No content"}</span>
        {item && (
          <>
            <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-[#98a2b3] sm:block" />
            <span className="hidden shrink-0 font-semibold capitalize text-[#667085] sm:inline">{item.status}</span>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden rounded-lg border border-[#e4e7ec] bg-white p-0.5 md:flex">
          {previewDevices.map((previewDevice) => (
            <button
              key={previewDevice.id}
              type="button"
              aria-label={previewDevice.label}
              title={previewDevice.label}
              aria-pressed={device === previewDevice.id}
              onClick={() => onSetDevice(previewDevice.id)}
              className={`min-h-9 rounded-md px-2.5 text-[10px] font-bold transition ${
                device === previewDevice.id
                  ? "bg-[#f1ecff] text-[#6d5dfc]"
                  : "text-[#667085] hover:bg-[#f8fafc] hover:text-[#172033]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <SvgIcon name={previewDevice.icon} className="h-4 w-4" />
                <span className="hidden 2xl:inline">{previewDevice.id === "tablet" ? "Tablet" : previewDevice.id === "mobile" ? "Mobile" : "Desktop"}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="hidden rounded-lg border border-[#e4e7ec] bg-white p-0.5 sm:flex">
          {(["fit", "100"] as PreviewZoom[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-label={value === "fit" ? "Fit preview to canvas" : "Show preview at 100 percent"}
              aria-pressed={zoom === value}
              onClick={() => onSetZoom(value)}
              className={`min-h-9 rounded-md px-2.5 text-[10px] font-bold transition ${
                zoom === value
                  ? "bg-[#f1ecff] text-[#6d5dfc]"
                  : "text-[#667085] hover:bg-[#f8fafc] hover:text-[#172033]"
              }`}
            >
              {value === "fit" ? "Fit" : "100%"}
            </button>
          ))}
        </div>
        <span className="hidden whitespace-nowrap text-[10px] font-bold text-[#98a2b3] 2xl:inline">{previewWidth}px</span>
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-pressed={fullscreen}
          aria-label={fullscreen ? "Exit full-screen preview" : "Open full-screen preview"}
          className={`hidden min-h-10 items-center rounded-lg border px-3 text-[10px] font-bold transition md:inline-flex ${
            fullscreen
              ? "border-violet-300 bg-violet-50 text-violet-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
          }`}
        >
          {fullscreen ? "Exit full" : "Full screen"}
        </button>
        <span className="hidden h-6 w-px bg-slate-200 xl:block" />
        <button
          type="button"
          onClick={onOpenWebsiteSetup}
          aria-label="Open site settings"
          title="Site settings"
          className="hidden h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 xl:grid"
        >
          <SvgIcon name="settings" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onViewLive}
          disabled={!item}
          aria-label="View live page"
          title="View live page"
          className="hidden h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-40 xl:grid"
        >
          <SvgIcon name="desktop" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isBusy}
          className="hidden h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-40 xl:block"
        >
          Save
        </button>
        {onPublishPage && (
          <button
            type="button"
            onClick={onPublishPage}
            disabled={isBusy}
            data-testid="publish-page"
            className="hidden h-9 rounded-lg bg-violet-600 px-3.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40 xl:block"
          >
            Publish page
          </button>
        )}
        <button
          type="button"
          onClick={onReview}
          disabled={isBusy}
          data-testid="publish-content"
          className="hidden h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-40 xl:block"
        >
          {blockingIssues > 0 ? "Review all" : "Publish all"}
        </button>
        <button
          type="button"
          onClick={onOpenProperties}
          aria-pressed={propertiesOpen}
          className="cms-editor-properties-trigger hidden min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-[#667085] shadow-sm transition hover:border-[#c7b8ff] hover:text-[#6247ff] sm:inline-flex"
        >
          Edit
        </button>
      </div>
    </header>
  );
}
