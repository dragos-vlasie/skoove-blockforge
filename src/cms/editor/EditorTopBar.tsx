import { contentPath } from "../contentUtils";
import { SvgIcon } from "../icons";
import type { CmsTab } from "../types";
import type { CollectionDefinition, CollectionEntry, ContentGraph, PageContent } from "../../../types";
import { LocaleSelector } from "../localization/LocaleSelector";
import type { Selection } from "../types";

type EditorTopBarProps = {
  graph: ContentGraph;
  item: PageContent | CollectionEntry | null;
  definition?: CollectionDefinition | null;
  message: string;
  isBusy: boolean;
  blockingIssues: number;
  onSetTab: (tab: CmsTab) => void;
  onSave: () => void;
  onOpenWebsiteSetup: () => void;
  onPublishClick: () => void;
  onPublishPage?: () => void;
  onSelectContent: (selection: Selection) => void;
  onCreateTranslation: (locale: string) => void;
};

export function EditorTopBar({
  graph,
  item,
  definition,
  message,
  isBusy,
  blockingIssues,
  onSetTab,
  onSave,
  onOpenWebsiteSetup,
  onPublishClick,
  onPublishPage,
  onSelectContent,
  onCreateTranslation,
}: EditorTopBarProps) {
  const displayName = graph.site.siteName || "BlockForge";
  const compactStatus = message || "Ready to edit";
  const publishLabel = blockingIssues > 0 ? "Review all" : "Publish all";
  const viewCurrentItem = () => item && window.open(contentPath(item, graph, definition), "_blank");

  return (
    <header className="sticky top-0 z-50 flex min-h-14 items-center gap-2 border-b border-[#e4e7ec] bg-white px-2.5 py-2 sm:px-4 lg:hidden">
      <button
        type="button"
        onClick={() => onSetTab("content")}
        aria-label="Back to content"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d5dfc]"
      >
        <SvgIcon name="chevronLeft" className="h-5 w-5" />
      </button>
      <div className="hidden h-6 w-px bg-[#e4e7ec] sm:block" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 text-xs text-[#667085]">
          <button type="button" onClick={() => onSetTab("content")} className="hidden hover:text-[#4f3fe0] sm:inline">
            {displayName}
          </button>
          <span className="hidden sm:inline">/</span>
          <strong className="truncate font-medium text-[#172033]">{item?.title || "Untitled"}</strong>
        </div>
        <p className="truncate text-[11px] text-[#667085]">{compactStatus}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LocaleSelector
          graph={graph}
          item={item}
          onSelectContent={onSelectContent}
          onCreateTranslation={onCreateTranslation}
        />
        <button
          type="button"
          onClick={onOpenWebsiteSetup}
          aria-label="Open site settings"
          title="Site settings"
          className="hidden h-10 w-10 place-items-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#172033] sm:grid"
        >
          <SvgIcon name="settings" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={viewCurrentItem}
          disabled={!item}
          aria-label="View live page"
          className="grid h-10 w-10 place-items-center rounded-lg border border-[#d9dee7] bg-white text-[#667085] transition hover:border-[#b9adff] hover:text-[#4f3fe0] disabled:opacity-40 sm:flex sm:w-auto sm:gap-2 sm:px-3 sm:text-sm sm:font-medium"
        >
          <SvgIcon name="desktop" className="h-4 w-4" />
          <span className="hidden sm:inline">View live</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isBusy}
          className="hidden h-10 rounded-lg border border-[#d9dee7] bg-white px-3 text-sm font-medium text-[#344054] transition hover:border-[#b9adff] hover:text-[#4f3fe0] disabled:opacity-40 sm:block"
        >
          Save
        </button>
        {onPublishPage && (
          <button
            type="button"
            onClick={onPublishPage}
            disabled={isBusy}
            data-testid="publish-page"
            className="h-10 rounded-lg bg-[#6d5dfc] px-3 text-sm font-medium text-white transition hover:bg-[#5947e8] disabled:opacity-40 sm:px-4"
          >
            <span className="sm:hidden">Page</span>
            <span className="hidden sm:inline">Publish page</span>
          </button>
        )}
        <button
          type="button"
          onClick={onPublishClick}
          disabled={isBusy}
          data-testid="publish-content"
          className={`h-10 rounded-lg border px-2.5 text-sm font-medium transition disabled:opacity-40 sm:px-3 ${
            blockingIssues > 0
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "border-[#d9dee7] bg-white text-[#344054] hover:border-[#b9adff] hover:text-[#4f3fe0]"
          }`}
        >
          {publishLabel}
        </button>
      </div>
    </header>
  );
}
