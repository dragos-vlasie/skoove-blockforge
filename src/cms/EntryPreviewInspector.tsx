import type { ReactNode } from "react";
import type { CollectionDefinition, CollectionEntry } from "../../types";
import {
  createEntryFieldSourceMap,
  createEntryPreviewContent,
  type PreviewFieldSource,
} from "./fieldNavigation";
import { PreviewFieldHighlightProvider, type PreviewFieldIntent } from "./fieldHighlight";

export function EntryPreviewInspector({
  entry,
  definition,
  activePath,
  locale,
  onSelectField,
  children,
}: {
  entry: CollectionEntry;
  definition?: CollectionDefinition | null;
  activePath: string | null;
  locale?: string;
  onSelectField: (path: string, source?: PreviewFieldSource, intent?: PreviewFieldIntent) => void;
  children: ReactNode;
}) {
  return (
    <PreviewFieldHighlightProvider
      activePath={activePath}
      onSelectField={onSelectField}
      content={createEntryPreviewContent(entry)}
      sourceMap={createEntryFieldSourceMap({ entry, definition, locale })}
    >
      {children}
    </PreviewFieldHighlightProvider>
  );
}
