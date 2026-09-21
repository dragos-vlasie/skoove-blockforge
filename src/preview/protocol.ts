export const previewMessageType = {
  ready: "blockforge:preview:ready",
  render: "blockforge:preview:render",
  updateSubject: "blockforge:preview:update-subject",
  setActiveBlock: "blockforge:preview:set-active-block",
  selectBlock: "blockforge:preview:select-block",
  scroll: "blockforge:preview:scroll",
  scrollTo: "blockforge:preview:scroll-to",
  scrollToElement: "blockforge:preview:scroll-to-element",
} as const;

export const previewProtocolVersion = 2;

export type RemotePreviewRoute = {
  graph: any;
  subject: any;
  routeType: "page" | "entry";
  path: string;
  page?: number;
  collection?: any;
};

export type ParentToPreviewMessage =
  | { type: typeof previewMessageType.render; route: RemotePreviewRoute; activeBlockId?: string | null }
  | { type: typeof previewMessageType.updateSubject; subject: any }
  | { type: typeof previewMessageType.setActiveBlock; activeBlockId?: string | null }
  | { type: typeof previewMessageType.scrollTo; position: { x: number; y: number } }
  | { type: typeof previewMessageType.scrollToElement; attribute: string; value: string };

export type PreviewToParentMessage =
  | { type: typeof previewMessageType.ready; protocolVersion?: number }
  | { type: typeof previewMessageType.selectBlock; blockId: string }
  | { type: typeof previewMessageType.scroll; position: { x: number; y: number } };

export const isPreviewMessage = (value: unknown): value is { type: string } =>
  Boolean(value && typeof value === "object" && typeof (value as { type?: unknown }).type === "string");
