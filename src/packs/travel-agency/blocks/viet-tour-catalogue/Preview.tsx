import { VietTourCatalogueView, type VietTourCatalogueContent, type VietTourCatalogueEntry } from "./View";
import type { ContentGraph } from "../../../../../types";
import { selectTourCatalogueEntries, type TourCatalogueQuery } from "../../tourModel";

export function Preview({ content, entries, graph, onSelectEntry }: { content: VietTourCatalogueContent; entries?: VietTourCatalogueEntry[]; graph?: ContentGraph; onSelectEntry?: (entryId: string) => void }) {
  const resolvedEntries = entries ?? (graph ? selectTourCatalogueEntries(graph, { ...(content as TourCatalogueQuery), includeDraft: true }) : []);
  return <VietTourCatalogueView content={content} entries={resolvedEntries} onEntrySelect={onSelectEntry} />;
}
