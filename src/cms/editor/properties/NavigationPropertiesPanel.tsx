import { NavigationEditor } from "../../adminPanels";
import type { ContentGraph, NavigationMenu } from "../../../../types";
import type { GlobalComponentId } from "../types";

export function NavigationPropertiesPanel({
  graph,
  selectedGlobalComponent,
  onChangeNavigation,
}: {
  graph: ContentGraph;
  selectedGlobalComponent: GlobalComponentId;
  onChangeNavigation: (navigation: NavigationMenu[]) => void;
}) {
  const selectedGlobalComponentLabel =
    selectedGlobalComponent === "header" ? "Header Navigation" : "Footer Navigation";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-violet-50 px-3 py-2 text-[11px] font-semibold text-violet-800">
        <span>{selectedGlobalComponentLabel}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-violet-700">Site-wide</span>
      </div>
      <NavigationEditor
        graph={graph}
        onChange={onChangeNavigation}
        compact
        focusLocation={selectedGlobalComponent}
      />
    </div>
  );
}
