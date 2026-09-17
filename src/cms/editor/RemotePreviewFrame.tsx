import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cmsApiUrl, type CmsWorkspaceScope } from "../../lib/cms/workspaceTypes";
import {
  isPreviewMessage,
  previewMessageType,
  type ParentToPreviewMessage,
  type PreviewToParentMessage,
  type RemotePreviewRoute,
} from "../../preview/protocol";
import type { PreviewFrameHandle } from "./PreviewFrame";

type RemotePreviewFrameProps = {
  activeBlockId: string | null;
  label: string;
  onSelectBlock: (blockId: string) => void;
  route: RemotePreviewRoute;
  scale: number;
  width: number;
  workspace: CmsWorkspaceScope;
};

export const RemotePreviewFrame = forwardRef<PreviewFrameHandle, RemotePreviewFrameProps>(
  function RemotePreviewFrame({
    activeBlockId,
    label,
    onSelectBlock,
    route,
    scale,
    width,
    workspace,
  }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const routeRef = useRef(route);
    const activeBlockIdRef = useRef(activeBlockId);
    const scrollPositionRef = useRef({ x: 0, y: 0 });
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewOrigin, setPreviewOrigin] = useState("");
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");

    routeRef.current = route;
    activeBlockIdRef.current = activeBlockId;

    const send = (message: ParentToPreviewMessage) => {
      if (!previewOrigin) return;
      iframeRef.current?.contentWindow?.postMessage(message, previewOrigin);
    };

    const render = () => send({
      type: previewMessageType.render,
      route: routeRef.current,
      activeBlockId: activeBlockIdRef.current,
    });

    useEffect(() => {
      let cancelled = false;
      setError("");
      setReady(false);
      fetch(cmsApiUrl("/api/cms/preview-token", workspace), { headers: { accept: "application/json" } })
        .then(async (response) => {
          const body = await response.json() as { previewUrl?: string; error?: string };
          if (!response.ok || !body.previewUrl) throw new Error(body.error || "Unable to create the live preview URL.");
          if (cancelled) return;
          setPreviewUrl(body.previewUrl);
          setPreviewOrigin(new URL(body.previewUrl).origin);
        })
        .catch((reason) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to open the live preview.");
        });
      return () => { cancelled = true; };
    }, [workspace.siteId, workspace.tenantId]);

    useEffect(() => {
      const receive = (event: MessageEvent<PreviewToParentMessage>) => {
        if (
          !previewOrigin
          || event.origin !== previewOrigin
          || event.source !== iframeRef.current?.contentWindow
          || !isPreviewMessage(event.data)
        ) return;

        if (event.data.type === previewMessageType.ready) {
          setReady(true);
          window.requestAnimationFrame(render);
        }
        if (event.data.type === previewMessageType.selectBlock && event.data.blockId) {
          onSelectBlock(event.data.blockId);
        }
        if (event.data.type === previewMessageType.scroll) {
          scrollPositionRef.current = event.data.position;
        }
      };
      window.addEventListener("message", receive);
      return () => window.removeEventListener("message", receive);
    }, [onSelectBlock, previewOrigin]);

    useEffect(() => {
      if (ready) render();
    }, [activeBlockId, ready, route]);

    useImperativeHandle(ref, () => ({
      getScrollPosition: () => scrollPositionRef.current,
      scrollToPosition(position) {
        send({ type: previewMessageType.scrollTo, position });
        scrollPositionRef.current = position;
        return Boolean(iframeRef.current?.contentWindow);
      },
      scrollToElement(attribute, value) {
        send({ type: previewMessageType.scrollToElement, attribute, value });
      },
    }));

    if (error) {
      return (
        <div
          className="grid min-h-[420px] place-items-center bg-white px-8 text-center text-slate-900 shadow-xl shadow-slate-400/20"
          style={{ width: `${width}px`, zoom: scale }}
        >
          <div className="max-w-lg">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-600">Live preview unavailable</p>
            <p className="mt-3 text-lg font-bold">{error}</p>
            <p className="mt-2 text-sm text-slate-600">The editor is still available. Fix the client deployment and refresh this page.</p>
          </div>
        </div>
      );
    }

    return previewUrl ? (
      <iframe
        ref={iframeRef}
        title={label}
        src={previewUrl}
        className="block border-0 bg-white shadow-xl shadow-slate-400/20"
        style={{ width: `${width}px`, height: `${100 / scale}%`, zoom: scale }}
        onLoad={() => setReady(false)}
        allow="clipboard-read; clipboard-write"
      />
    ) : (
      <div
        className="grid min-h-[420px] place-items-center bg-white text-sm font-semibold text-slate-600 shadow-xl shadow-slate-400/20"
        style={{ width: `${width}px`, zoom: scale }}
      >
        Preparing the client preview…
      </div>
    );
  },
);
