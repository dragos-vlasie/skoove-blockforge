export type WordPressEntityKind = "post" | "page";

export type WordPressRenderedValue = {
  rendered?: string;
};

export type WordPressLink = {
  href?: string;
  embeddable?: boolean;
  taxonomy?: string;
};

export type WordPressEntity = {
  id: number;
  date?: string;
  date_gmt?: string;
  modified?: string;
  modified_gmt?: string;
  slug: string;
  status?: string;
  type?: string;
  link?: string;
  title?: WordPressRenderedValue;
  excerpt?: WordPressRenderedValue;
  content?: WordPressRenderedValue & { raw?: string; protected?: boolean };
  author?: number;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
  yoast_head_json?: Record<string, any>;
  jetpack_featured_media_url?: string;
  _links?: Record<string, WordPressLink[]>;
  _embedded?: Record<string, any[]>;
  [key: string]: unknown;
};

export type WordPressTerm = {
  id: number;
  count?: number;
  description?: string;
  link?: string;
  name: string;
  slug: string;
  taxonomy?: string;
  parent?: number;
};

export type WordPressMedia = {
  id: number;
  date?: string;
  modified?: string;
  slug?: string;
  status?: string;
  type?: string;
  link?: string;
  title?: WordPressRenderedValue;
  caption?: WordPressRenderedValue;
  description?: WordPressRenderedValue;
  alt_text?: string;
  media_type?: string;
  mime_type?: string;
  source_url?: string;
  media_details?: {
    width?: number;
    height?: number;
    file?: string;
    filesize?: number;
    sizes?: Record<string, { source_url?: string; width?: number; height?: number }>;
  };
};

export type WordPressUser = {
  id: number;
  name?: string;
  slug?: string;
  link?: string;
  description?: string;
  avatar_urls?: Record<string, string>;
};

export type RichTextMark = {
  type: "bold" | "italic" | "strike" | "code" | "underline" | "subscript" | "superscript" | "link";
  attrs?: Record<string, unknown>;
};

export type RichTextNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: RichTextMark[];
  content?: RichTextNode[];
};

export type MigrationSource = {
  platform: "wordpress";
  siteUrl: string;
  entityKind: WordPressEntityKind;
  entityId: number;
  sourceUrl: string;
  sourceModified?: string;
};

export type MigrationBlock = {
  id: string;
  type: string;
  content: Record<string, unknown>;
  migration: {
    source: MigrationSource;
    sourceElement: string;
    sourceClasses?: string[];
    sourceInlineStyle?: string;
  };
};

export type LinkedMedia = {
  sourceUrl: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  sourceAttachmentId?: number;
  sourceElement: string;
};

export type MigrationLink = {
  href: string;
  text: string;
  internal: boolean;
  affiliate: boolean;
};

export type MigrationIssueSeverity = "info" | "warning" | "blocking";

export type MigrationIssue = {
  code: string;
  severity: MigrationIssueSeverity;
  message: string;
  sourceElement?: string;
  sourceClasses?: string[];
  sourceHtml?: string;
};

export type ParsedWordPressHtml = {
  blocks: MigrationBlock[];
  linkedMedia: LinkedMedia[];
  links: MigrationLink[];
  issues: MigrationIssue[];
  styleInventory: {
    classes: Record<string, number>;
    inlineStyles: string[];
    alignments: Record<string, number>;
  };
  stats: {
    headings: number;
    paragraphs: number;
    orderedLists: number;
    unorderedLists: number;
    blockquotes: number;
    images: number;
    galleries: number;
    tables: number;
    embeds: number;
    fallbackFragments: number;
  };
};

export type NormalizedWordPressDocument = {
  schemaVersion: 1;
  id: string;
  kind: WordPressEntityKind;
  title: string;
  slug: string;
  locale?: string;
  translationGroupId?: string;
  path?: string;
  status: "draft" | "published";
  templateId: "article-standard" | "landing-page";
  excerpt: string;
  author: string;
  publishedAt?: string;
  updatedAt: string;
  categoryIds: string[];
  tagIds: string[];
  seo: Record<string, unknown>;
  blocks: MigrationBlock[];
  linkedMedia: LinkedMedia[];
  links: MigrationLink[];
  issues: MigrationIssue[];
  styleInventory: ParsedWordPressHtml["styleInventory"];
  stats: ParsedWordPressHtml["stats"];
  source: MigrationSource & {
    checksum: string;
    rawContentAvailable: boolean;
  };
};

export type WordPressCollectionSummary = {
  endpoint: string;
  total: number;
  pages: number;
};

export type WordPressSiteAudit = {
  schemaVersion: 1;
  generatedAt: string;
  siteUrl: string;
  apiUrl: string;
  locale?: string;
  collections: Record<string, WordPressCollectionSummary>;
  routes: Array<{
    kind: WordPressEntityKind | "category" | "tag";
    id: number;
    slug: string;
    url: string;
    title: string;
    status?: string;
    parentId?: number;
    count?: number;
    locale?: string;
    translationGroupId?: string;
  }>;
  categoryTree: Array<WordPressTerm & { children: WordPressTerm[] }>;
  notes: string[];
};

export type WordPressLocaleCandidate = {
  code: string;
  hreflang: string;
  url: string;
  pathPrefix: string;
  source: "html-lang" | "hreflang" | "configured";
  isDefault: boolean;
  rest: {
    reachable: boolean;
    posts: number;
    pages: number;
    sampleUrl?: string;
    error?: string;
  };
};

export type WordPressLocalizationManifest = {
  schemaVersion: 1;
  generatedAt: string;
  siteUrl: string;
  defaultLocale: string;
  locales: WordPressLocaleCandidate[];
  notes: string[];
};

/** Plugin-specific code maps source translation relationships into the stable importer contract. */
export type WordPressLocalizationAdapter = {
  id: string;
  name: string;
  localeQueryParameter?: string;
  resolveTranslationGroup?: (input: {
    entity: WordPressEntity;
    kind: WordPressEntityKind;
    locale?: string;
  }) => string | undefined | Promise<string | undefined>;
};

export type WordPressSiteImportFailure = {
  kind: WordPressEntityKind;
  id: number;
  slug: string;
  sourceUrl: string;
  message: string;
};

export type WordPressRouteMigration = {
  kind: WordPressEntityKind;
  sourceId: number;
  sourceUrl: string;
  sourcePath: string;
  targetPath: string;
  redirectRequired: boolean;
};

export type WordPressSiteImport = {
  schemaVersion: 1;
  generatedAt: string;
  siteUrl: string;
  mediaMode: "linked";
  documents: NormalizedWordPressDocument[];
  failures: WordPressSiteImportFailure[];
  routes: WordPressRouteMigration[];
  summary: {
    requested: number;
    imported: number;
    failed: number;
    blocks: number;
    linkedMedia: number;
    blockingIssues: number;
    warningIssues: number;
  };
};
