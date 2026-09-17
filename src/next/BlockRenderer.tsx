import type { ComponentType } from "react";
import { BlockType } from "../../types";
import { nextBlockViews } from "../blocks/nextRegistry";
import { BlogGridView } from "../blocks/blog-grid/View";
import { normalizeCompositionColumns, normalizeCompositionLayout } from "../blocks/two-column/composition";
import { getBlockPackId } from "../packs/registry";
import { VietTourCatalogueView } from "../packs/travel-agency/blocks/viet-tour-catalogue/View";
import { selectTourCatalogueEntries } from "../packs/travel-agency/tourModel";
import { generatedClientExtensionViews } from "../extensions/generatedViews";

export type ClientExtensionViews = Record<string, ComponentType<any>>;

function BlockRendererContent({ block, graph, subject, page = 1, path = "/", extensionViews = generatedClientExtensionViews }: any & { extensionViews?: ClientExtensionViews }) {
  if (block.type === BlockType.TWO_COLUMN) {
    const content = block.content ?? {};
    const columns = normalizeCompositionColumns(content);
    return <section className="core-composition site-section" data-layout={normalizeCompositionLayout(content.layout)} data-gap={content.gap ?? "lg"} data-spacing={content.padding ?? "lg"}>
      <div className="core-composition__grid site-container">
        {columns.map((column: any, columnIndex: number) => <div className="core-composition__cell" key={column.id || columnIndex}>
          {column.blocks.map((nestedBlock: any) => nestedBlock.type === BlockType.TWO_COLUMN
            ? <div key={nestedBlock.id} className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-8 text-center">Nested two-column layouts are not supported.</div>
            : <div className="core-composition__item" key={nestedBlock.id}><BlockRenderer block={nestedBlock} graph={graph} subject={subject} page={page} path={path} extensionViews={extensionViews} /></div>)}
        </div>)}
      </div>
    </section>;
  }
  if (block.type === BlockType.SHARED_BLOCK) {
    const shared = graph?.sharedBlocks?.find((candidate: any) => candidate.id === block.content?.refId);
    return shared?.block && shared.block.type !== BlockType.SHARED_BLOCK
      ? <BlockRenderer block={shared.block} graph={graph} subject={subject} page={page} path={path} extensionViews={extensionViews} />
      : <div className="site-section"><div className="site-container">Missing shared block: {block.content?.refId || "none selected"}</div></div>;
  }
  if (block.type === BlockType.BLOG_GRID) {
    return <div className="pack-section" data-pack={getBlockPackId(block.type) ?? "core"} data-block-type={block.type}><BlogGridView content={block.content ?? {}} graph={graph} page={page} path={path} /></div>;
  }
  if (block.type === BlockType.TRAVEL_TOUR_CATALOGUE) {
    const entries = selectTourCatalogueEntries(graph, { ...(block.content ?? {}), includeDraft: false });
    return <div className="pack-section" data-pack={getBlockPackId(block.type) ?? "core"} data-block-type={block.type}><VietTourCatalogueView content={block.content ?? {}} entries={entries} /></div>;
  }
  const ExtensionView = extensionViews[block.type];
  if (ExtensionView) {
    return <div className="client-extension-section" data-block-type={block.type}>
      <ExtensionView content={block.content ?? {}} graph={graph} subject={subject} />
    </div>;
  }
  const View = nextBlockViews[block.type as BlockType];
  if (!View) return <div className="site-section"><div className="site-container">Unknown block type: {block.type}</div></div>;
  return <div className="pack-section" data-pack={getBlockPackId(block.type) ?? "core"} data-block-type={block.type}>
    <View content={block.content ?? {}} />
  </div>;
}

export function BlockRenderer(props: any & { extensionViews?: ClientExtensionViews }) {
  return (
    <div data-blockforge-block-id={props.block?.id} data-blockforge-block-type={props.block?.type} data-cms-preview-block={props.block?.id}>
      <BlockRendererContent {...props} />
    </div>
  );
}
