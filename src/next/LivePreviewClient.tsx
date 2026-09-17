"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  isPreviewMessage,
  previewMessageType,
  type ParentToPreviewMessage,
  type PreviewToParentMessage,
  type RemotePreviewRoute,
} from "../preview/protocol";
import { PublicSite } from "./PublicSite";

const sendToParent = (message: PreviewToParentMessage, parentOrigin: string) => {
  window.parent.postMessage(message, parentOrigin);
};

export function LivePreviewClient({ parentOrigin }: { parentOrigin: string }) {
  const [route, setRoute] = useState<RemotePreviewRoute | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => {
    const receive = (event: MessageEvent<ParentToPreviewMessage>) => {
      if (event.origin !== parentOrigin || event.source !== window.parent || !isPreviewMessage(event.data)) return;
      const message = event.data;

      if (message.type === previewMessageType.render) {
        setRoute(message.route);
        setActiveBlockId(message.activeBlockId ?? null);
      }
      if (message.type === previewMessageType.scrollTo) {
        window.scrollTo({ left: message.position.x, top: message.position.y, behavior: "auto" });
      }
      if (message.type === previewMessageType.scrollToElement) {
        const { attribute, value } = message;
        const target = Array.from(document.querySelectorAll<HTMLElement>(`[${attribute}]`))
          .find((element) => element.getAttribute(attribute) === value);
        if (target) window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - 12), behavior: "smooth" });
      }
    };

    let animationFrame = 0;
    const reportScroll = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        sendToParent({
          type: previewMessageType.scroll,
          position: { x: window.scrollX, y: window.scrollY },
        }, parentOrigin);
      });
    };

    window.addEventListener("message", receive);
    window.addEventListener("scroll", reportScroll, { passive: true });
    sendToParent({ type: previewMessageType.ready }, parentOrigin);
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("scroll", reportScroll);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [parentOrigin]);

  const selectBlock = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    const block = target?.closest?.<HTMLElement>("[data-blockforge-block-id]");
    if (target?.closest?.("a[href], button, summary")) event.preventDefault();
    if (!block) return;
    event.preventDefault();
    sendToParent({
      type: previewMessageType.selectBlock,
      blockId: block.dataset.blockforgeBlockId || "",
    }, parentOrigin);
  };

  if (!route) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center text-slate-700">
        <div>
          <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-violet-600 border-r-transparent" />
          <p className="mt-4 text-sm font-semibold">Connecting to BlockForge preview…</p>
        </div>
      </main>
    );
  }

  return (
    <div
      onClickCapture={selectBlock}
      data-blockforge-live-preview
    >
      <style>{activeBlockId ? `
        [data-blockforge-block-id="${CSS.escape(activeBlockId)}"] {
          outline: 3px solid #6d5dfc !important;
          outline-offset: -3px;
          position: relative;
          z-index: 1;
        }
      ` : ""}</style>
      <PublicSite route={route} preview />
    </div>
  );
}
