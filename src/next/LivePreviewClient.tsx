"use client";

import { memo, useEffect, useRef, useState } from "react";
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
import { PreviewOverlay } from "@blockforge/preview";

const MemoizedPublicSite = memo(PublicSite);

const sendToParent = (message: PreviewToParentMessage, parentOrigin: string) => {
  window.parent.postMessage(message, parentOrigin);
};

export function LivePreviewClient({ parentOrigin }: { parentOrigin: string }) {
  const [route, setRoute] = useState<RemotePreviewRoute | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [canAct, setCanAct] = useState(false);

  useEffect(() => {
    const receive = (event: MessageEvent<ParentToPreviewMessage>) => {
      if (event.origin !== parentOrigin || event.source !== window.parent || !isPreviewMessage(event.data)) return;
      const message = event.data;

      if (message.type === previewMessageType.render) {
        setRoute(message.route);
        setCanAct(message.capabilities?.includes(previewCapability.sectionActions) ?? false);
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
      capabilities: [previewCapability.subjectUpdates, previewCapability.sectionInsertion, previewCapability.sectionActions],
    }, parentOrigin);
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("scroll", reportScroll);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [parentOrigin]);

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

  const scope = { subjectId: route.subject.id, path: route.path };
  return (
    <>
      <div ref={rootRef} data-blockforge-live-preview>
        <MemoizedPublicSite route={route} preview />
      </div>
      <PreviewOverlay
        key={JSON.stringify(scope)}
        rootRef={rootRef}
        sections={route.subject.blocks ?? []}
        documentKey={JSON.stringify(scope)}
        activeBlockId={activeBlockId}
        canAct={canAct}
        onSelect={(blockId) => sendToParent({ type: previewMessageType.selectBlock, blockId, ...scope }, parentOrigin)}
        onAction={(blockId, action) => sendToParent({ type: previewMessageType.sectionAction, blockId, action, ...scope }, parentOrigin)}
        onInsert={(options) => sendToParent({ type: previewMessageType.requestSectionInsert, ...options, ...scope }, parentOrigin)}
      />
    </>
  );
}
