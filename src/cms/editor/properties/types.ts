import type {
  AssetMeta,
  BlockData,
  BlockType,
  CollectionDefinition,
  CollectionEntry,
  ContentGraph,
  NavigationMenu,
  PageContent,
  ValidationIssue,
} from "../../../../types";
import type { GlobalComponentId } from "../types";
import type { PreviewFieldSource } from "../../fieldNavigation";

export type PropertiesPanelTab = "content" | "technical" | "seo" | "design";

export type FieldNavigationRequest = {
  path: string;
  requestId: number;
};

export type BlockActionHandlers = {
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
};

export type TwoColumnActionHandlers = {
  patchTwoColumnContent: (blockId: string, updater: (content: Record<string, any>) => void) => void;
  addNestedBlock: (blockId: string, columnIndex: number, type: BlockType) => void;
  patchNestedBlock: (blockId: string, columnIndex: number, nestedBlockId: string, updater: (block: BlockData) => void) => void;
  removeNestedBlock: (blockId: string, columnIndex: number, nestedBlockId: string) => void;
  duplicateNestedBlock: (blockId: string, columnIndex: number, nestedBlockId: string) => void;
  moveNestedBlock: (blockId: string, columnIndex: number, nestedBlockId: string, direction: -1 | 1) => void;
};

export type PropertiesPanelProps = BlockActionHandlers & TwoColumnActionHandlers & {
  panel: PropertiesPanelTab;
  graph: ContentGraph;
  item: PageContent | CollectionEntry | null;
  definition?: CollectionDefinition | null;
  selectedBlock: BlockData | null;
  selectedGlobalComponent: GlobalComponentId | null;
  currentBlockingIssues: ValidationIssue[];
  issues: ValidationIssue[];
  onSetPanel: (panel: PropertiesPanelTab) => void;
  onOpenAi: () => void;
  onChangeNavigation: (navigation: NavigationMenu[]) => void;
  onPatchGraph: (updater: (graph: ContentGraph) => void) => void;
  onPatch: (updater: (item: PageContent | CollectionEntry) => void) => void;
  onPatchBlock: (blockId: string, updater: (block: BlockData) => void) => void;
  onUploadAsset?: (input: { file: File; alt?: string; folder?: string; tags?: string }) => Promise<AssetMeta | null>;
  onManageSharedBlock: (sharedBlockId: string, fieldPath?: string) => void;
  onDetachSharedBlockReference: (blockId: string) => void;
  onDuplicateContent: () => void;
  onDeleteContent: () => void;
  onOpenSharedBlockDialog: (block: BlockData) => void;
  onFocusField?: (path: string) => void;
  activeFieldPath?: string | null;
  activeFieldSource?: PreviewFieldSource | null;
  fieldNavigationRequest?: FieldNavigationRequest | null;
};
