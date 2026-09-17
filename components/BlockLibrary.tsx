import type { ComponentType } from "react";
import { BlockType } from "../types";
import { nextBlockPreviews } from "../src/blocks/nextRegistry";
import { PreviewFieldHighlightProvider } from "../src/cms/fieldHighlight";
import type { PreviewFieldIntent } from "../src/cms/fieldHighlight";
import {
  appendFieldPath,
  combineFieldPrefixes,
  createBlockFieldSourceMap,
  nestedBlockFieldPrefix,
  relativeFieldPath,
  sharedBlockFieldPrefix,
  type PreviewFieldSource,
  type PreviewFieldSourceContext,
} from "../src/cms/fieldNavigation";
import { getBlockDefinition } from "../src/blocks/registry";
import { getBlockPackId } from "../src/packs/registry";
import {
  normalizeCompositionColumns,
  normalizeCompositionLayout,
} from "../src/blocks/two-column/composition";

type PreviewComponent = ComponentType<{
  content: any;
  graph?: any;
  subject?: any;
  onSelectEntry?: (entryId: string) => void;
}>;
const previewRenderers = nextBlockPreviews as Partial<Record<BlockType, PreviewComponent>>;

export const BlockRenderer = ({
  block,
  sharedBlocks = [],
  graph,
  subject,
  onSelectEntry,
  activeFieldPath = null,
  onSelectField,
  fieldSourceContext,
}: {
  block: any;
  sharedBlocks?: any[];
  graph?: any;
  subject?: any;
  onSelectEntry?: (entryId: string) => void;
  activeFieldPath?: string | null;
  onSelectField?: (path: string, source?: PreviewFieldSource, intent?: PreviewFieldIntent) => void;
  fieldSourceContext?: PreviewFieldSourceContext;
}) => {
  if (block.type === BlockType.TWO_COLUMN) {
    const content = block.content ?? {};
    const columns = normalizeCompositionColumns(content);
    const layout = normalizeCompositionLayout(content.layout);

    return (
      <section
        className="core-composition site-section"
        data-layout={layout}
        data-gap={content.gap ?? "lg"}
        data-spacing={content.padding ?? "lg"}
      >
        <div className="core-composition__grid site-container">
          {columns.map((column) => (
            <div key={column.id} className="core-composition__cell">
              {column.blocks.map((nestedBlock: any) => {
                const fieldPrefix = nestedBlockFieldPrefix(column.id, nestedBlock.id);
                const nestedActiveFieldPath = relativeFieldPath(activeFieldPath, fieldPrefix);

                return nestedBlock.type === BlockType.TWO_COLUMN ? (
                  <div key={nestedBlock.id} className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-8 text-center text-sm font-bold text-amber-700">
                    Nested two-column layouts are not supported yet.
                  </div>
                ) : (
                  <div className="core-composition__item" key={nestedBlock.id}>
                    <BlockRenderer
                      block={nestedBlock}
                      sharedBlocks={sharedBlocks}
                      graph={graph}
                      subject={subject}
                      onSelectEntry={onSelectEntry}
                      activeFieldPath={nestedActiveFieldPath}
                      onSelectField={(path, source, intent) => onSelectField?.(appendFieldPath(fieldPrefix, path), source, intent)}
                      fieldSourceContext={{
                        sourceKind: fieldSourceContext?.sourceKind === "shared-block" ? "shared-block" : "nested-block",
                        sourceId: fieldSourceContext?.sourceKind === "shared-block" ? fieldSourceContext.sourceId : nestedBlock.id,
                        locale: fieldSourceContext?.locale ?? subject?.locale ?? graph?.site?.defaultLocale,
                        pathPrefix: combineFieldPrefixes(fieldSourceContext?.pathPrefix, fieldPrefix),
                      }}
                    />
                  </div>
                );
              })}
              {column.blocks.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
                  Empty column
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === BlockType.SHARED_BLOCK) {
    const sharedBlock = sharedBlocks.find((candidate) => candidate.id === block.content?.refId);

    if (!sharedBlock) {
      return (
        <div className="p-12 border-2 border-dashed border-amber-200 rounded-3xl text-center text-amber-700 bg-amber-50">
          Missing shared block: {block.content?.refId || "none selected"}
        </div>
      );
    }

    if (sharedBlock.block?.type === BlockType.SHARED_BLOCK) {
      return (
        <div className="p-12 border-2 border-dashed border-red-200 rounded-3xl text-center text-red-500">
          Shared blocks cannot reference another shared block.
        </div>
      );
    }

    const fieldPrefix = sharedBlockFieldPrefix(sharedBlock.id);
    const sharedSourcePrefix = combineFieldPrefixes(fieldSourceContext?.pathPrefix, fieldPrefix);

    return (
      <BlockRenderer
        block={sharedBlock.block}
        sharedBlocks={sharedBlocks}
        graph={graph}
        subject={subject}
        onSelectEntry={onSelectEntry}
        activeFieldPath={relativeFieldPath(activeFieldPath, fieldPrefix)}
        onSelectField={(path, source, intent) => onSelectField?.(appendFieldPath(fieldPrefix, path), source, intent)}
        fieldSourceContext={{
          sourceKind: "shared-block",
          sourceId: sharedBlock.id,
          locale: fieldSourceContext?.locale ?? subject?.locale ?? graph?.site?.defaultLocale,
          pathPrefix: sharedSourcePrefix,
        }}
      />
    );
  }

  const Renderer = previewRenderers[block.type as BlockType];
  const definition = getBlockDefinition(block.type, graph?.site?.clientExtensions);
  const packId = getBlockPackId(block.type) ?? "core";
  const sourceMap = definition
    ? createBlockFieldSourceMap({
        blockId: block.id,
        blockType: block.type,
        fields: definition.fields,
        content: block.content ?? {},
        context: fieldSourceContext ?? {
          sourceKind: "content",
          sourceId: subject?.id ?? block.id,
          locale: subject?.locale ?? graph?.site?.defaultLocale,
        },
      })
    : {};

  if (!Renderer) {
    if (definition && String(block.type).startsWith("CUSTOM:")) {
      const previewValues = definition.fields
        .map((field) => ({ label: field.label, value: block.content?.[field.id] }))
        .filter((entry) => entry.value !== undefined && entry.value !== "")
        .slice(0, 4);
      return (
        <section className="site-section border-y border-violet-200 bg-violet-50/70 py-12" data-block-type={block.type} data-pack={definition.packId}>
          <div className="site-container">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Client extension</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{definition.label}</h2>
            <p className="mt-2 text-sm text-slate-600">The dedicated client repository renders this component on the published website.</p>
            {previewValues.length > 0 && (
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {previewValues.map((entry) => (
                  <div className="rounded-xl border border-violet-100 bg-white p-3" key={entry.label}>
                    <dt className="text-xs font-semibold text-slate-500">{entry.label}</dt>
                    <dd className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">{typeof entry.value === "string" || typeof entry.value === "number" ? String(entry.value) : "Configured"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      );
    }
    return (
      <div className="p-12 border-2 border-dashed border-red-200 rounded-3xl text-center text-red-500">
        Unknown block type: {block.type}
      </div>
    );
  }

  return (
    <div className="pack-section" data-pack={packId} data-block-type={block.type}>
      <PreviewFieldHighlightProvider activePath={activeFieldPath} onSelectField={onSelectField} content={block.content ?? {}} sourceMap={sourceMap}>
        <Renderer content={block.content} graph={graph} subject={subject} onSelectEntry={onSelectEntry} />
      </PreviewFieldHighlightProvider>
    </div>
  );
};
