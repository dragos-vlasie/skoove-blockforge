export type IconName =
  | "logo"
  | "editor"
  | "content"
  | "collections"
  | "settings"
  | "home"
  | "desktop"
  | "tablet"
  | "mobile"
  | "grip"
  | "plus"
  | "trash"
  | "spark"
  | "arrowUp"
  | "arrowDown"
  | "copy"
  | "check"
  | "more"
  | "hero"
  | "textBlock"
  | "featureGrid"
  | "image"
  | "video"
  | "table"
  | "columns"
  | "chart"
  | "accordion"
  | "tabs"
  | "cardGrid"
  | "buttonCta"
  | "cta"
  | "shared"
  | "menu"
  | "close"
  | "search"
  | "chevronLeft"
  | "chevronRight";

export function EditorRailButton({
  active = false,
  label,
  icon,
  onClick,
  testId,
}: {
  active?: boolean;
  label: string;
  icon: IconName;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      data-testid={testId}
      className={`group relative grid h-11 w-11 place-items-center rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-[#6d5dfc] focus-visible:ring-offset-2 ${
        active ? "bg-[#f2efff] text-[#6d5dfc]" : "text-[#667085] hover:bg-[#f8fafc] hover:text-[#172033]"
      }`}
    >
      <SvgIcon name={icon} className="h-5 w-5" />
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#e4e7ec] bg-white px-3 py-2 text-xs font-semibold text-[#172033] shadow-lg group-hover:block group-focus-visible:block">
        {label}
      </span>
    </button>
  );
}

export function SvgIcon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {name === "logo" && (
        <>
          <rect x="4" y="4" width="7" height="7" rx="2" fill="currentColor" opacity="0.95" />
          <rect x="13" y="4" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
          <rect x="4" y="13" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
          <rect x="13" y="13" width="7" height="7" rx="2" fill="currentColor" opacity="0.95" />
        </>
      )}
      {name === "editor" && (
        <>
          <rect x="4" y="5" width="16" height="11" rx="2" {...strokeProps} />
          <path d="M9 20h6M12 16v4" {...strokeProps} />
        </>
      )}
      {name === "content" && (
        <>
          <path d="M7 4h7l3 3v13H7z" {...strokeProps} />
          <path d="M14 4v4h4M9 11h6M9 15h6" {...strokeProps} />
        </>
      )}
      {name === "collections" && (
        <>
          <path d="M12 3 4 7l8 4 8-4z" {...strokeProps} />
          <path d="m4 12 8 4 8-4M4 17l8 4 8-4" {...strokeProps} />
        </>
      )}
      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" {...strokeProps} />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8l-.3 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3.1h4.8l.3-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z" {...strokeProps} />
        </>
      )}
      {name === "home" && (
        <>
          <path d="m3 11 9-8 9 8" {...strokeProps} />
          <path d="M5 10v10h14V10" {...strokeProps} />
        </>
      )}
      {name === "desktop" && (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" {...strokeProps} />
          <path d="M8 20h8M12 16v4" {...strokeProps} />
        </>
      )}
      {name === "tablet" && (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2" {...strokeProps} />
          <path d="M11 18h2" {...strokeProps} />
        </>
      )}
      {name === "mobile" && (
        <>
          <rect x="8" y="3" width="8" height="18" rx="2" {...strokeProps} />
          <path d="M11 18h2" {...strokeProps} />
        </>
      )}
      {name === "grip" && (
        <>
          <circle cx="9" cy="6" r="1.5" fill="currentColor" />
          <circle cx="15" cy="6" r="1.5" fill="currentColor" />
          <circle cx="9" cy="12" r="1.5" fill="currentColor" />
          <circle cx="15" cy="12" r="1.5" fill="currentColor" />
          <circle cx="9" cy="18" r="1.5" fill="currentColor" />
          <circle cx="15" cy="18" r="1.5" fill="currentColor" />
        </>
      )}
      {name === "plus" && <path d="M12 5v14M5 12h14" {...strokeProps} />}
      {name === "arrowUp" && (
        <>
          <path d="M12 19V5" {...strokeProps} />
          <path d="m5 12 7-7 7 7" {...strokeProps} />
        </>
      )}
      {name === "arrowDown" && (
        <>
          <path d="M12 5v14" {...strokeProps} />
          <path d="m19 12-7 7-7-7" {...strokeProps} />
        </>
      )}
      {name === "copy" && (
        <>
          <rect x="8" y="8" width="11" height="11" rx="2" {...strokeProps} />
          <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" {...strokeProps} />
        </>
      )}
      {name === "check" && <path d="m5 12 4 4 10-10" {...strokeProps} />}
      {name === "more" && (
        <>
          <circle cx="6" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="18" cy="12" r="1.5" fill="currentColor" />
        </>
      )}
      {name === "trash" && (
        <>
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" {...strokeProps} />
        </>
      )}
      {name === "spark" && (
        <>
          <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8z" {...strokeProps} />
          <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" {...strokeProps} />
        </>
      )}
      {name === "menu" && (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" {...strokeProps} />
        </>
      )}
      {name === "close" && <path d="m6 6 12 12M18 6 6 18" {...strokeProps} />}
      {name === "search" && (
        <>
          <circle cx="11" cy="11" r="6" {...strokeProps} />
          <path d="m16 16 4 4" {...strokeProps} />
        </>
      )}
      {name === "chevronLeft" && <path d="m15 18-6-6 6-6" {...strokeProps} />}
      {name === "chevronRight" && <path d="m9 18 6-6-6-6" {...strokeProps} />}
      {name === "hero" && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" {...strokeProps} />
          <path d="M7 10h7M7 13h5M15 16h3" {...strokeProps} />
        </>
      )}
      {name === "textBlock" && (
        <>
          <path d="M5 6h14M5 10h10M5 14h14M5 18h8" {...strokeProps} />
        </>
      )}
      {name === "featureGrid" && (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="14" y="4" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="4" y="14" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="14" y="14" width="6" height="6" rx="1.5" {...strokeProps} />
        </>
      )}
      {name === "image" && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" {...strokeProps} />
          <path d="m7 16 4-4 3 3 2-2 3 3" {...strokeProps} />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" />
        </>
      )}
      {name === "video" && (
        <>
          <rect x="4" y="6" width="16" height="12" rx="2" {...strokeProps} />
          <path d="m10 10 5 2-5 2z" fill="currentColor" />
        </>
      )}
      {name === "table" && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" {...strokeProps} />
          <path d="M4 10h16M4 15h16M10 5v14M15 5v14" {...strokeProps} />
        </>
      )}
      {name === "columns" && (
        <>
          <rect x="4" y="5" width="7" height="14" rx="2" {...strokeProps} />
          <rect x="13" y="5" width="7" height="14" rx="2" {...strokeProps} />
        </>
      )}
      {name === "chart" && (
        <>
          <path d="M5 19V9M12 19V5M19 19v-7" {...strokeProps} />
          <path d="M4 19h16" {...strokeProps} />
        </>
      )}
      {name === "accordion" && (
        <>
          <rect x="4" y="5" width="16" height="4" rx="1.5" {...strokeProps} />
          <rect x="4" y="11" width="16" height="8" rx="1.5" {...strokeProps} />
          <path d="M8 7h5M8 14h8M8 17h5" {...strokeProps} />
        </>
      )}
      {name === "tabs" && (
        <>
          <path d="M4 8h16" {...strokeProps} />
          <path d="M6 5h5v3H6zM13 5h5v3h-5z" {...strokeProps} />
          <rect x="4" y="8" width="16" height="11" rx="2" {...strokeProps} />
        </>
      )}
      {name === "cardGrid" && (
        <>
          <rect x="4" y="5" width="7" height="6" rx="1.5" {...strokeProps} />
          <rect x="13" y="5" width="7" height="6" rx="1.5" {...strokeProps} />
          <rect x="4" y="13" width="7" height="6" rx="1.5" {...strokeProps} />
          <rect x="13" y="13" width="7" height="6" rx="1.5" {...strokeProps} />
        </>
      )}
      {name === "buttonCta" && (
        <>
          <path d="M5 8h14M7 12h10" {...strokeProps} />
          <rect x="7" y="15" width="10" height="4" rx="2" {...strokeProps} />
        </>
      )}
      {name === "cta" && (
        <>
          <rect x="4" y="6" width="16" height="12" rx="3" {...strokeProps} />
          <path d="M8 11h8M10 15h4" {...strokeProps} />
        </>
      )}
      {name === "shared" && (
        <>
          <path d="M8 8h8v8H8z" {...strokeProps} />
          <path d="M5 5h8M11 19h8M5 5v8M19 11v8" {...strokeProps} />
        </>
      )}
    </svg>
  );
}
