import { normalizeSpacerHeight, spacerHeightClasses } from "./spacer";

/** Guides are absolutely positioned: preview and published layout have identical height. */
export function Spacer({ height }: { height: unknown }) {
  const pixels = normalizeSpacerHeight(height);
  return (
    <div data-content-spacer={pixels} aria-hidden="true" className={`relative clear-both m-0 w-full shrink-0 ${spacerHeightClasses[pixels]}`}>
      <span className="pointer-events-none absolute inset-0 hidden items-center justify-center border-y border-dashed border-violet-300 bg-violet-50/60 [[data-blockforge-editing=true]_&]:flex">
        <span className="rounded bg-white px-1 text-[10px] leading-3 text-violet-700">Spacer · {pixels}px</span>
      </span>
    </div>
  );
}
