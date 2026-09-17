import type { ContentGraph, ValidationIssue } from "../../../../types";

export type ContentStoreMode = "local" | "github" | "database" | "remote";

export type ContentStorePublishResult = {
  graph: ContentGraph;
  warnings: string[];
};

export type ContentStorePublishOptions = {
  publishedGraph?: ContentGraph;
  expectedPublishedUpdatedAt?: string;
};

export type PublishContentResult =
  | { ok: true; graph: ContentGraph; issues: ValidationIssue[]; warnings: string[] }
  | { ok: false; graph: ContentGraph; issues: ValidationIssue[]; warnings: string[] };

export interface ContentStore {
  readonly mode: ContentStoreMode;
  getDraft(): Promise<ContentGraph>;
  saveDraft(graph: ContentGraph): Promise<ContentGraph>;
  getPublished(): Promise<ContentGraph>;
  publish(
    graph: ContentGraph,
    options?: ContentStorePublishOptions,
  ): Promise<ContentStorePublishResult>;
}

export class ContentStoreConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentStoreConfigurationError";
  }
}
