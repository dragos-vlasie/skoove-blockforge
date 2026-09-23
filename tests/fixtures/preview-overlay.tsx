import { memo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PreviewOverlay } from "@blockforge/preview";

declare global { interface Window { previewEvents: any[]; contentRenders: number; emptyPreview: () => void; } }
window.previewEvents = [];
window.contentRenders = 0;
const Content = memo(function Content({ empty }: { empty: boolean }) {
  window.contentRenders++;
  return <div className="mx-auto w-4/5 pt-24">
    {!empty && <>
      <div data-blockforge-block-id="table" className="h-60 bg-slate-100 p-8"><h2>Table section</h2><div data-blockforge-block-id="nested-child">Nested content</div></div>
      <div data-blockforge-block-id="text" className="mt-12 h-[900px] bg-slate-50 p-8"><h2>Text section</h2><button onClick={() => window.previewEvents.push("website-click")}>Website action</button><a href="/destination">Website link</a></div>
    </>}
  </div>;
});
function Fixture() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  window.emptyPreview = () => setEmpty(true);
  return <><div ref={rootRef}><Content empty={empty} /></div><PreviewOverlay
    rootRef={rootRef} activeBlockId={active} documentKey="page-a" canAct
    sections={empty ? [] : [{ id: "table", type: "TABLE" }, { id: "text", type: "TEXT" }]}
    onSelect={(id) => { setActive(id); window.previewEvents.push({ select: id }); }}
    onAction={(id, action) => window.previewEvents.push({ id, action })}
    onInsert={(options) => window.previewEvents.push({ insert: options })}
  /></>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
