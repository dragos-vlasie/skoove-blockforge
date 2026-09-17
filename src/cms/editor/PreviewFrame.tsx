import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { DesignConfig } from "../../../types";
import { getGoogleFontHref, getThemePreset } from "../../themes/registry";

export type PreviewFrameHandle = {
  scrollToElement: (attribute: string, value: string) => void;
  getScrollPosition: () => { x: number; y: number };
  scrollToPosition: (position: { x: number; y: number }) => boolean;
};

type PreviewFrameProps = {
  children: ReactNode;
  expandToContent?: boolean;
  label: string;
  scale: number;
  themeStyle: CSSProperties & Record<`--${string}`, string>;
  themeDesign?: Partial<DesignConfig>;
  themeId?: string;
  width: number;
  resetKey?: string | number | null;
};

const frameDocument = (baseUrl: string, language: string) => `<!doctype html>
<html lang="${language}">
  <head>
    <base href="${baseUrl}">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body><div id="cms-preview-root"></div></body>
</html>`;

export const PreviewFrame = forwardRef<PreviewFrameHandle, PreviewFrameProps>(
  function PreviewFrame(
    { children, expandToContent = false, label, resetKey, scale, themeDesign, themeStyle, themeId = "clean-saas", width },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
    const [contentHeight, setContentHeight] = useState(1);
    const themePreset = getThemePreset(themeId, themeDesign);
    const themeRecipe = themePreset.recipe;

    const prepareFrame = useCallback(() => {
      const iframe = iframeRef.current;
      const frame = iframe?.contentDocument;
      if (!iframe || !frame?.head || !frame.body) return;

      const head = frame.head;
      const body = frame.body;
      const documentElement = frame.documentElement;
      const previewRoot = frame.getElementById("cms-preview-root");
      if (!head || !body || !documentElement || !previewRoot) return;

      const syncStyles = () => {
        head
          .querySelectorAll("[data-cms-preview-style]")
          .forEach((node) => node.remove());

        document.head
          .querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
            "style, link[rel='stylesheet']",
          )
          .forEach((source) => {
            const clone = source.cloneNode(true) as HTMLElement;
            clone.setAttribute("data-cms-preview-style", "true");
            head.appendChild(clone);
          });

        const fontHref = getGoogleFontHref([
          themeDesign?.headingFont,
          themeDesign?.bodyFont,
        ]);
        if (fontHref) {
          const fontStyles = frame.createElement("link");
          fontStyles.setAttribute("data-cms-preview-style", "true");
          fontStyles.rel = "stylesheet";
          fontStyles.href = fontHref;
          head.appendChild(fontStyles);
        }
      };

      syncStyles();
      documentElement.style.background = "transparent";
      body.style.margin = "0";
      body.style.minWidth = "0";
      body.style.minHeight = expandToContent ? "0" : "100%";
      setMountNode(previewRoot);
    }, [expandToContent, themeDesign?.bodyFont, themeDesign?.headingFont]);

    useEffect(() => {
      prepareFrame();
    }, [prepareFrame]);

    useEffect(() => {
      const iframe = iframeRef.current;
      const frame = iframe?.contentDocument;
      const documentElement = frame?.documentElement;
      const body = frame?.body;
      if (!iframe || !frame || !documentElement || !body) return;

      documentElement.scrollTop = 0;
      body.scrollTop = 0;
      iframe.contentWindow?.scrollTo(0, 0);
    }, [resetKey]);

    useEffect(() => {
      if (!expandToContent || !mountNode) return;

      const frame = iframeRef.current?.contentDocument;
      const ResizeObserverConstructor = frame?.defaultView?.ResizeObserver;
      if (!frame || !ResizeObserverConstructor) return;

      const body = frame.body;
      const documentElement = frame.documentElement;
      if (!body || !documentElement) return;

      const updateHeight = () => {
        setContentHeight(Math.max(
          1,
          mountNode.scrollHeight,
          body.scrollHeight,
          documentElement.scrollHeight,
        ));
      };
      const observer = new ResizeObserverConstructor(updateHeight);
      observer.observe(mountNode);
      updateHeight();
      return () => observer.disconnect();
    }, [children, expandToContent, mountNode, width]);

    useImperativeHandle(ref, () => ({
      getScrollPosition() {
        const frameWindow = iframeRef.current?.contentWindow;
        return { x: frameWindow?.scrollX ?? 0, y: frameWindow?.scrollY ?? 0 };
      },
      scrollToPosition(position) {
        const frameWindow = iframeRef.current?.contentWindow;
        if (!frameWindow) return false;
        frameWindow.scrollTo({ left: position.x, top: position.y, behavior: "auto" });
        return true;
      },
      scrollToElement(attribute, value) {
        const frame = iframeRef.current?.contentDocument;
        const frameWindow = iframeRef.current?.contentWindow;
        if (!frame || !frameWindow) return;

        const target = Array.from(
          frame.querySelectorAll<HTMLElement>(`[${attribute}]`),
        ).find((element) => element.getAttribute(attribute) === value);
        if (!target) return;
        const targetTop = target.getBoundingClientRect().top + frameWindow.scrollY;
        frameWindow.scrollTo({ top: Math.max(0, targetTop - 12), behavior: "smooth" });
      },
    }));

    return (
      <iframe
        ref={iframeRef}
        title={label}
        srcDoc={frameDocument(
          typeof document === "undefined" ? "/" : document.baseURI,
          typeof document === "undefined"
            ? "en"
            : document.documentElement.lang || "en",
        )}
        onLoad={prepareFrame}
        className="block border-0 bg-white shadow-xl shadow-slate-400/20"
        scrolling={expandToContent ? "no" : "yes"}
        style={{
          width: `${width}px`,
          height: expandToContent ? `${contentHeight}px` : `${100 / scale}%`,
          zoom: scale,
        }}
      >
        {mountNode &&
          createPortal(
            <div
              data-cms-preview-root
              data-site-theme={themePreset.id}
              data-theme-family={themeRecipe.family}
              data-theme-recipe-version={themeRecipe.version}
              onClickCapture={(event) => {
                const target = event.target as HTMLElement | null;
                if (target && typeof target.closest === "function" && target.closest("a[href]")) {
                  event.preventDefault();
                }
              }}
              style={{
                ...themeStyle,
                minHeight: expandToContent ? "0" : "100%",
                width: "100%",
              }}
            >
              {children}
            </div>,
            mountNode,
          )}
      </iframe>
    );
  },
);
