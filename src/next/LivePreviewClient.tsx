"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import {
  isPreviewMessage,
  previewCapability,
  previewMessageType,
  previewProtocolVersion,
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
  const [insertionPoint, setInsertionPoint] = useState<{
    afterBlockId?: string;
    atIndex?: number;
    label: string;
    left: number;
    top: number;
  } | null>(null);
  const insertionKeyRef = useRef<string | null>(null);

  const clearInsertionPoint = () => {
    if (insertionKeyRef.current === null) return;
    insertionKeyRef.current = null;
    setInsertionPoint(null);
  };

  useEffect(() => {
    const receive = (event: MessageEvent<ParentToPreviewMessage>) => {
      if (event.origin !== parentOrigin || event.source !== window.parent || !isPreviewMessage(event.data)) return;
      const message = event.data;

      if (message.type === previewMessageType.render) {
        setRoute(message.route);
        setActiveBlockId(message.activeBlockId ?? null);
      }
      if (message.type === previewMessageType.updateSubject) {
        setRoute((current) => current ? { ...current, subject: message.subject } : current);
      }
      if (message.type === previewMessageType.setActiveBlock) {
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
    sendToParent({
      type: previewMessageType.ready,
      protocolVersion: previewProtocolVersion,
      capabilities: [previewCapability.subjectUpdates, previewCapability.sectionInsertion],
    }, parentOrigin);
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("scroll", reportScroll);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [parentOrigin]);

  const selectBlock = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("[data-blockforge-insertion-control]")) return;
    const block = target?.closest?.<HTMLElement>("[data-blockforge-block-id]");
    if (target?.closest?.("a[href], button, summary")) event.preventDefault();
    if (!block) return;
    event.preventDefault();
    sendToParent({
      type: previewMessageType.selectBlock,
      blockId: block.dataset.blockforgeBlockId || "",
    }, parentOrigin);
  };

  const updateInsertionPoint = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("[data-blockforge-insertion-control]")) return;

    const block = target?.closest?.<HTMLElement>("[data-blockforge-block-id]");
    const blockId = block?.dataset.blockforgeBlockId;
    if (!block || !blockId) {
      clearInsertionPoint();
      return;
    }

    const rect = block.getBoundingClientRect();
    const firstBlock = document.querySelector<HTMLElement>("[data-blockforge-block-id]");
    const insertAtStart = block === firstBlock && event.clientY - rect.top < 28;
    const nextKey = `${insertAtStart ? "start" : "after"}:${blockId}`;
    if (insertionKeyRef.current === nextKey) return;
    insertionKeyRef.current = nextKey;
    setInsertionPoint({
      ...(insertAtStart ? { atIndex: 0 } : { afterBlockId: blockId }),
      label: insertAtStart ? "Add section at the beginning" : "Add section after this section",
      left: Math.max(20, Math.min(window.innerWidth - 20, rect.left + rect.width / 2)),
      top: Math.max(16, Math.min(window.innerHeight - 18, insertAtStart ? rect.top : rect.bottom)),
    });
  };

  const requestSectionInsert = () => {
    if (!insertionPoint) return;
    sendToParent({
      type: previewMessageType.requestSectionInsert,
      ...(insertionPoint.afterBlockId ? { afterBlockId: insertionPoint.afterBlockId } : { atIndex: insertionPoint.atIndex ?? 0 }),
    }, parentOrigin);
    clearInsertionPoint();
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
      onPointerMoveCapture={updateInsertionPoint}
      onPointerLeave={clearInsertionPoint}
      data-blockforge-live-preview
      className="cursor-pointer"
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
      {insertionPoint && (
        <div
          data-blockforge-insertion-control
          className="fixed z-[2147483647] -translate-x-1/2 -translate-y-1/2"
          style={{ left: insertionPoint.left, top: insertionPoint.top }}
          onPointerMove={(event) => event.stopPropagation()}
        >
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-px w-20 -translate-x-1/2 -translate-y-1/2 bg-violet-400/80" />
          <button
            type="button"
            aria-label={insertionPoint.label}
            title={insertionPoint.label}
            onClick={requestSectionInsert}
            className="relative inline-flex h-8 items-center gap-1.5 rounded-full border border-violet-400 bg-white px-2.5 text-[11px] font-bold text-violet-700 shadow-lg shadow-violet-950/15 transition hover:border-violet-600 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            <span>Add section</span>
          </button>
        </div>
      )}
    </div>
  );
}
