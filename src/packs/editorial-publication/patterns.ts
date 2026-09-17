import { BlockType } from "../../../types";
import type { PackPatternDefinition } from "../types";

export const editorialPublicationPatterns = [
  {
    id: "editorial-publication.home",
    name: "Publication homepage",
    description: "A publication home focused on a lead story and article discovery.",
    category: "home",
    subject: "page",
    minimumConfidence: 0.5,
    signals: [
      { type: "route", values: ["/"], match: "exact", weight: 0.25, label: "Uses the root URL" },
      { type: "block", values: [BlockType.BLOG_GRID], weight: 0.35, label: "Surfaces editorial entries" },
      { type: "block", values: [BlockType.HERO, BlockType.TEXT], match: "any", weight: 0.2, label: "Has editorial introduction" },
      { type: "title", values: ["home", "latest", "stories", "journal"], match: "contains", weight: 0.2, label: "Publication-oriented title" },
    ],
  },
  {
    id: "editorial-publication.article",
    name: "Editorial article",
    description: "A repeatable long-form post with semantic rich text and publication metadata.",
    category: "editorial",
    subject: "entry",
    minimumConfidence: 0.45,
    signals: [
      { type: "collection-preset", values: ["article"], weight: 0.35, label: "Belongs to an article collection" },
      { type: "template", values: ["article-standard"], weight: 0.25, label: "Uses an article template" },
      { type: "schema", values: ["Article", "BlogPosting", "NewsArticle"], weight: 0.2, label: "Uses editorial structured data" },
      { type: "block", values: [BlockType.TEXT, BlockType.IMAGE_GALLERY, BlockType.VIDEO_EMBED, BlockType.TABLE], match: "any", weight: 0.2, label: "Contains long-form content" },
    ],
  },
  {
    id: "editorial-publication.topic-index",
    name: "Topic index",
    description: "A topic or category page that introduces and lists related stories.",
    category: "listing",
    subject: "page",
    minimumConfidence: 0.45,
    signals: [
      { type: "block", values: [BlockType.BLOG_GRID], weight: 0.45, label: "Lists editorial entries" },
      { type: "route", values: ["category", "topic", "guides", "stories"], match: "contains", weight: 0.3, label: "Uses a topic-oriented URL" },
      { type: "title", values: ["guides", "stories", "articles", "journal"], match: "contains", weight: 0.25, label: "Uses a topic-oriented title" },
    ],
  },
] as const satisfies readonly PackPatternDefinition[];
