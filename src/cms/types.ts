import type { PageContent } from "../../types";

export type CmsTab = "editor" | "content" | "media" | "analytics" | "settings";

export type Selection = { kind: "page" | "entry"; id: string };

export type CreateContentInput = {
  title: string;
  slug: string;
  status: PageContent["status"];
  seoTitle: string;
  seoDescription: string;
  parentId?: string | null;
  fields?: Record<string, any>;
  blueprintId?: string;
};

export type CreateContentDraft = {
  type: "page" | string;
  title: string;
  slug: string;
  parentId: string;
  status: PageContent["status"];
  seoTitle: string;
  seoDescription: string;
  blueprintId: string;
  requiredFields: Record<string, any>;
};
