"use client";

import {
  createContext,
  createElement,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { PreviewFieldSource, PreviewFieldSourceMap } from "./fieldNavigation";

type PreviewFieldHighlightContextValue = {
  activePath: string | null;
  enabled: boolean;
  onSelectField?: (path: string, source?: PreviewFieldSource, intent?: PreviewFieldIntent) => void;
  sourceMap: PreviewFieldSourceMap;
};

export type PreviewFieldIntent = "select" | "edit";

type PreviewContentEntry = {
  path: string;
  value: string;
};

const isPreviewElement = (target: EventTarget | null): target is HTMLElement =>
  Boolean(
    target &&
    typeof (target as HTMLElement).closest === "function" &&
    typeof (target as HTMLElement).getBoundingClientRect === "function",
  );

type InspectorPreviewField = {
  path: string;
  label: string;
  source?: PreviewFieldSource;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

const fieldLabel = (path: string) => {
  const fieldName = path.split("/").at(-1)?.split(".").filter((part) => !/^\d+$/.test(part)).at(-1) ?? "field";
  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
};

const normalizedText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

const richTextValue = (value: any): string => {
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  return Array.isArray(value.content) ? value.content.map(richTextValue).join(" ") : "";
};

const contentEntries = (content: Record<string, any>): PreviewContentEntry[] => {
  const entries: PreviewContentEntry[] = [];

  const visit = (value: any, path: string) => {
    if (value == null || value === "") return;
    if (value && typeof value === "object" && value.type === "doc") {
      const text = normalizedText(richTextValue(value));
      if (text) entries.push({ path, value: text });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}.${index}`));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => visit(item, `${path}.${key}`));
      return;
    }

    const text = normalizedText(value);
    if (text) entries.push({ path, value: text });
  };

  Object.entries(content ?? {}).forEach(([key, value]) => visit(value, key));
  return entries;
};

const elementMatchesValue = (element: HTMLElement, value: string) => {
  const attributeValues = ["src", "href", "alt", "title"]
    .map((name) => element.getAttribute(name))
    .filter(Boolean)
    .map(normalizedText);
  if (attributeValues.some((candidate) => candidate === value || candidate.endsWith(value))) return true;
  return normalizedText(element.textContent) === value;
};

const matchingElements = (boundary: HTMLElement, value: string) =>
  Array.from(boundary.querySelectorAll<HTMLElement>("*")).filter(
    (element) =>
      elementMatchesValue(element, value) &&
      !Array.from(element.children).some((child) => elementMatchesValue(child as HTMLElement, value)),
  );

const elementForEntry = (
  boundary: HTMLElement,
  entry: PreviewContentEntry,
  entries: PreviewContentEntry[],
) => {
  const sameValueEntries = entries.filter((candidate) => candidate.value === entry.value);
  const occurrence = Math.max(0, sameValueEntries.findIndex((candidate) => candidate.path === entry.path));
  const elements = matchingElements(boundary, entry.value);
  return elements[occurrence] ?? elements[0] ?? null;
};

const entryForTarget = (
  target: HTMLElement,
  boundary: HTMLElement,
  entries: PreviewContentEntry[],
) => {
  let element: HTMLElement | null = target;

  while (element && element !== boundary) {
    const matches = entries.filter((entry) => elementMatchesValue(element!, entry.value));
    if (matches.length) {
      const value = matches[0].value;
      const sameValueEntries = entries.filter((entry) => entry.value === value);
      const elements = matchingElements(boundary, value);
      const occurrence = Math.max(0, elements.indexOf(element));
      return sameValueEntries[occurrence] ?? matches[0];
    }
    element = element.parentElement;
  }

  return null;
};

const PreviewFieldHighlightContext = createContext<PreviewFieldHighlightContextValue>({
  activePath: null,
  enabled: false,
  sourceMap: {},
});

export function PreviewFieldHighlightProvider({
  activePath,
  onSelectField,
  content = {},
  sourceMap = {},
  children,
}: {
  activePath: string | null;
  onSelectField?: (path: string, source?: PreviewFieldSource, intent?: PreviewFieldIntent) => void;
  content?: Record<string, any>;
  sourceMap?: PreviewFieldSourceMap;
  children: ReactNode;
}) {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);
  const [hoveredField, setHoveredField] = useState<InspectorPreviewField | null>(null);
  const [selectedField, setSelectedField] = useState<InspectorPreviewField | null>(null);
  const entries = useMemo(() => contentEntries(content), [content]);
  const value = useMemo(
    () => ({
      activePath,
      enabled: true,
      onSelectField,
      sourceMap,
    }),
    [activePath, onSelectField, sourceMap],
  );

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;

    boundary.querySelectorAll<HTMLElement>("[data-cms-field-auto-active]").forEach((element) => {
      element.removeAttribute("data-cms-field-auto-active");
    });
    if (!activePath) {
      selectedElementRef.current = null;
      setSelectedField(null);
      return;
    }

    const taggedElement = Array.from(boundary.querySelectorAll<HTMLElement>("[data-cms-field]"))
      .find((element) => element.dataset.cmsField?.split(/\s+/).includes(activePath));
    const entry = taggedElement ? null : entries.find((candidate) => candidate.path === activePath);
    const element = taggedElement ?? (entry ? elementForEntry(boundary, entry, entries) : null);

    if (!element) {
      selectedElementRef.current = null;
      setSelectedField(null);
      return;
    }

    if (!taggedElement) element.setAttribute("data-cms-field-auto-active", "true");
    selectedElementRef.current = element;
    const rect = element.getBoundingClientRect();
    setSelectedField({
      path: activePath,
      label: sourceMap[activePath]?.fieldLabel ?? fieldLabel(activePath),
      source: sourceMap[activePath],
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    });
  }, [activePath, entries, sourceMap]);

  useEffect(() => {
    const frameWindow = boundaryRef.current?.ownerDocument.defaultView;
    if (!frameWindow) return;

    const syncInspectorPosition = () => {
      hoveredElementRef.current = null;
      setHoveredField(null);
      const selectedElement = selectedElementRef.current;
      if (!selectedElement || !boundaryRef.current?.contains(selectedElement)) return;
      const rect = selectedElement.getBoundingClientRect();
      setSelectedField((current) => current ? {
        ...current,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      } : null);
    };
    frameWindow.addEventListener("scroll", syncInspectorPosition, true);
    frameWindow.addEventListener("resize", syncInspectorPosition);
    return () => {
      frameWindow.removeEventListener("scroll", syncInspectorPosition, true);
      frameWindow.removeEventListener("resize", syncInspectorPosition);
    };
  }, []);

  const updateHoveredField = (target: HTMLElement) => {
    const boundary = boundaryRef.current;
    if (!boundary || target.closest("[data-cms-inspector-control]")) return;

    const taggedElement = target.closest<HTMLElement>("[data-cms-field]");
    const explicitPath = taggedElement?.dataset.cmsField?.split(/\s+/).find(Boolean);
    const fallbackEntry = explicitPath ? null : entryForTarget(target, boundary, entries);
    const element = taggedElement ?? (fallbackEntry ? elementForEntry(boundary, fallbackEntry, entries) : null);
    const path = explicitPath ?? fallbackEntry?.path;

    if (!element || !path || !boundary.contains(element)) {
      hoveredElementRef.current = null;
      setHoveredField(null);
      return;
    }
    if (hoveredElementRef.current === element && hoveredField?.path === path) return;

    hoveredElementRef.current = element;
    const rect = element.getBoundingClientRect();
    setHoveredField({
      path,
      label: sourceMap[path]?.fieldLabel ?? fieldLabel(path),
      source: sourceMap[path],
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    });
  };

  return (
    <PreviewFieldHighlightContext.Provider value={value}>
      <div
        ref={boundaryRef}
        className="contents"
        data-cms-preview-field-boundary
        onMouseMoveCapture={(event) => {
          if (isPreviewElement(event.target)) updateHoveredField(event.target);
        }}
        onMouseLeave={() => {
          hoveredElementRef.current = null;
          setHoveredField(null);
        }}
        onClickCapture={(event) => {
          const boundary = boundaryRef.current;
          const target = event.target;
          if (!boundary || !isPreviewElement(target)) return;
          if (target.closest("[data-cms-inspector-control]")) return;
          const taggedTarget = target.closest<HTMLElement>("[data-cms-field]");
          if (taggedTarget) {
            const path = taggedTarget.dataset.cmsField?.split(/\s+/).find(Boolean);
            if (!path) return;
            event.preventDefault();
            event.stopPropagation();
            onSelectField?.(path, sourceMap[path], "select");
            return;
          }

          const entry = entryForTarget(target, boundary, entries);
          if (!entry) return;

          event.preventDefault();
          event.stopPropagation();
          onSelectField?.(entry.path, sourceMap[entry.path], "select");
        }}
      >
        {children}
        {selectedField && (
          <>
            <span
              aria-hidden="true"
              data-cms-inspector-control
              className="pointer-events-none fixed z-[82] rounded-[4px] border-2 border-violet-600 bg-violet-500/5 shadow-[0_0_0_3px_rgba(255,255,255,0.9),0_8px_26px_rgba(76,29,149,0.22)]"
              style={{
                top: selectedField.rect.top,
                left: selectedField.rect.left,
                width: selectedField.rect.width,
                height: selectedField.rect.height,
              }}
            />
            <button
              type="button"
              data-cms-inspector-control
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectField?.(selectedField.path, selectedField.source, "edit");
              }}
              className="fixed z-[83] inline-flex min-h-7 items-center gap-1.5 rounded-md bg-violet-700 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg shadow-violet-950/25 transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              style={{
                top: Math.max(6, selectedField.rect.top - 32),
                left: Math.max(6, selectedField.rect.left),
              }}
              aria-label={`Edit ${selectedField.label}`}
            >
              <span aria-hidden="true">✎</span>
              Editing {selectedField.label}
              {selectedField.source?.sourceKind === "shared-block" && (
                <span className="rounded bg-white/20 px-1 py-0.5 text-[8px] uppercase tracking-wide">Shared</span>
              )}
            </button>
          </>
        )}
        {hoveredField && hoveredField.path !== selectedField?.path && (
          <>
            <span
              aria-hidden="true"
              data-cms-inspector-control
              className="pointer-events-none fixed z-[80] rounded-[4px] border-2 border-violet-500 bg-violet-500/5 shadow-[0_0_0_3px_rgba(255,255,255,0.8),0_8px_24px_rgba(76,29,149,0.18)]"
              style={{
                top: hoveredField.rect.top,
                left: hoveredField.rect.left,
                width: hoveredField.rect.width,
                height: hoveredField.rect.height,
              }}
            />
            <button
              type="button"
              data-cms-inspector-control
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectField?.(hoveredField.path, hoveredField.source, "edit");
              }}
              className="fixed z-[81] inline-flex min-h-7 items-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              style={{
                top: Math.max(6, hoveredField.rect.top - 32),
                left: Math.max(6, hoveredField.rect.left),
              }}
              aria-label={`Edit ${hoveredField.label}`}
            >
              <span aria-hidden="true">✎</span>
              Edit {hoveredField.label}
              {hoveredField.source?.sourceKind === "shared-block" && (
                <span className="rounded bg-white/20 px-1 py-0.5 text-[8px] uppercase tracking-wide">Shared</span>
              )}
            </button>
          </>
        )}
      </div>
    </PreviewFieldHighlightContext.Provider>
  );
}

export function usePreviewField(path: string | string[]) {
  const context = useContext(PreviewFieldHighlightContext);
  const paths = Array.isArray(path) ? path : [path];

  if (!context.enabled) return {};

  return {
    "data-cms-field": paths.join(" "),
    "data-cms-field-active": context.activePath && paths.includes(context.activePath) ? "true" : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      context.onSelectField?.(paths[0], context.sourceMap[paths[0]], "select");
    },
  };
}

export function PreviewField({
  as = "span",
  path,
  children,
  ...props
}: {
  as?: ElementType;
  path: string | string[];
  children?: ReactNode;
  [key: string]: any;
}) {
  const previewProps = usePreviewField(path);
  return createElement(as, { ...props, ...previewProps }, children);
}
