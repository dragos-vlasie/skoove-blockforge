export enum BlockType {
  HERO = "HERO",
  MEDIA = "MEDIA",
  RENTAL_HERO = "RENTAL_HERO",
  RENTAL_ABOUT = "RENTAL_ABOUT",
  RENTAL_FEATURES = "RENTAL_FEATURES",
  RENTAL_PROBLEM = "RENTAL_PROBLEM",
  RENTAL_CTA = "RENTAL_CTA",
  RENTAL_IMAGE_TEXT = "RENTAL_IMAGE_TEXT",
  TEXT = "TEXT",
  FEATURES = "FEATURES",
  LOGO_CLOUD = "LOGO_CLOUD",
  FEATURE_BENTO = "FEATURE_BENTO",
  IMAGE_TEXT = "IMAGE_TEXT",
  TESTIMONIALS = "TESTIMONIALS",
  PRICING = "PRICING",
  BLOG_GRID = "BLOG_GRID",
  CONTACT_FORM = "CONTACT_FORM",
  NEWSLETTER_SIGNUP = "NEWSLETTER_SIGNUP",
  PUBLICATION_HERO = "PUBLICATION_HERO",
  PUBLICATION_GATEWAY_CAROUSEL = "PUBLICATION_GATEWAY_CAROUSEL",
  FAQ = "FAQ",
  IMAGE_GALLERY = "IMAGE_GALLERY",
  VIDEO_EMBED = "VIDEO_EMBED",
  TABLE = "TABLE",
  CTA = "CTA",
  STATS = "STATS",
  UI_ACCORDION = "UI_ACCORDION",
  UI_TABS = "UI_TABS",
  UI_CARD_GRID = "UI_CARD_GRID",
  UI_BUTTON_CTA = "UI_BUTTON_CTA",
  TWO_COLUMN = "TWO_COLUMN",
  SHARED_BLOCK = "SHARED_BLOCK",
  TRAVEL_EDITORIAL_HERO = "VIET_EDITORIAL_HERO",
  TRAVEL_SECTION_HEADING = "VIET_SECTION_HEADING",
  TRAVEL_FEATURED_OFFER = "VIET_FEATURED_OFFER",
  TRAVEL_JOURNEY_GRID = "VIET_JOURNEY_GRID",
  TRAVEL_TRUST_STRIP = "VIET_TRUST_STRIP",
  TRAVEL_CONTACT_CTA = "VIET_CONTACT_CTA",
  TRAVEL_TOUR_CATALOGUE = "VIET_TOUR_CATALOGUE",
  TRAVEL_TOUR_OVERVIEW = "VIET_TOUR_OVERVIEW",
  TRAVEL_DEPARTURE_SCHEDULE = "VIET_DEPARTURE_SCHEDULE",
  TRAVEL_PROGRAMME_LINK = "VIET_PROGRAMME_LINK",
  TRAVEL_TOUR_STORY = "VIET_TOUR_STORY",
  TRAVEL_TOUR_ENQUIRY = "VIET_TOUR_ENQUIRY",
  TRAVEL_TOUR_PACKAGE = "VIET_TOUR_PACKAGE",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_EDITORIAL_HERO. */
  VIET_EDITORIAL_HERO = "VIET_EDITORIAL_HERO",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_SECTION_HEADING. */
  VIET_SECTION_HEADING = "VIET_SECTION_HEADING",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_FEATURED_OFFER. */
  VIET_FEATURED_OFFER = "VIET_FEATURED_OFFER",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_JOURNEY_GRID. */
  VIET_JOURNEY_GRID = "VIET_JOURNEY_GRID",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_TRUST_STRIP. */
  VIET_TRUST_STRIP = "VIET_TRUST_STRIP",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_CONTACT_CTA. */
  VIET_CONTACT_CTA = "VIET_CONTACT_CTA",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_TOUR_CATALOGUE. */
  VIET_TOUR_CATALOGUE = "VIET_TOUR_CATALOGUE",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_TOUR_OVERVIEW. */
  VIET_TOUR_OVERVIEW = "VIET_TOUR_OVERVIEW",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_DEPARTURE_SCHEDULE. */
  VIET_DEPARTURE_SCHEDULE = "VIET_DEPARTURE_SCHEDULE",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_PROGRAMME_LINK. */
  VIET_PROGRAMME_LINK = "VIET_PROGRAMME_LINK",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_TOUR_STORY. */
  VIET_TOUR_STORY = "VIET_TOUR_STORY",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_TOUR_ENQUIRY. */
  VIET_TOUR_ENQUIRY = "VIET_TOUR_ENQUIRY",
  /** @deprecated Stored-content compatibility alias. Use TRAVEL_TOUR_PACKAGE. */
  VIET_TOUR_PACKAGE = "VIET_TOUR_PACKAGE",
}

export type BlockTypeId = BlockType | `CUSTOM:${string}`;

export type ViewType = "editor" | "console" | "reusable" | "settings";
export type EditorMode = "client" | "builder";
export type BlueprintSubjectKind = "page" | "entry";
export type BlueprintCategory =
  | "blank"
  | "home"
  | "landing"
  | "listing"
  | "detail"
  | "contact"
  | "editorial"
  | "legal";

export interface BlueprintFieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
}

export interface BlueprintBlockDefinition {
  type: BlockTypeId;
  content?: Record<string, any>;
}

export interface ContentBlueprintDefinition {
  id: string;
  name: string;
  description: string;
  outcome: string;
  subject: BlueprintSubjectKind;
  category: BlueprintCategory;
  source: "pack" | "custom";
  packId?: string;
  patternId?: string;
  templateId: string;
  collectionMatch?: {
    presets?: CollectionDefinition["preset"][];
    terms?: string[];
  };
  blocks: BlueprintBlockDefinition[];
  essentialFields?: BlueprintFieldDefinition[];
  defaults?: {
    title?: string;
    seoDescription?: string;
    fields?: Record<string, any>;
  };
  preview?: {
    eyebrow?: string;
    title?: string;
    description?: string;
    tone?: "neutral" | "editorial" | "conversion" | "catalogue";
  };
  sourceSubjectId?: string;
  createdAt?: string;
}

export interface BlueprintAssignment {
  id: string;
  subjectKind: BlueprintSubjectKind;
  subjectId: string;
  status: "assigned" | "custom";
  patternId?: string;
  blueprintId?: string;
  updatedAt: string;
}

export type TextNodeType =
  | "h1"
  | "h2"
  | "h3"
  | "p"
  | "ul"
  | "ol"
  | "blockquote"
  | "hr";

export interface TextNode {
  type: TextNodeType;
  value: string | string[];
}

export type ContentStatus = "draft" | "published" | "archived";
export type RobotsDirective = "index,follow" | "noindex,follow" | "noindex,nofollow";
export type TwitterCardType = "summary" | "summary_large_image";
export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";
export type SchemaType =
  | "WebPage"
  | "Article"
  | "Product"
  | "Person"
  | "CollectionPage";

export interface SEOData {
  title: string;
  description: string;
  ogImage?: string;
  keywords?: string;
  canonical?: string;
  robots?: RobotsDirective;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: TwitterCardType;
  schemaType?: SchemaType;
  changeFrequency?: SitemapChangeFrequency;
  sitemapPriority?: number;
}

export interface BlockData {
  id: string;
  type: BlockTypeId;
  content: Record<string, any>;
}

export interface SharedBlock extends Omit<LocalizedRecord, "path"> {
  id: string;
  name: string;
  status: ContentStatus;
  block: BlockData;
  updatedAt: string;
}

export interface OrganizationConfig {
  name: string;
  logo?: string;
  sameAs: string[];
}

export interface DesignConfig {
  themeId: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  radius: "sm" | "md" | "lg";
}

export interface EnabledFeatures {
  contentModels?: boolean;
  mediaLibrary?: boolean;
  sharedBlocks?: boolean;
}

export type LocaleDirection = "ltr" | "rtl";
export type LocaleRoutingStrategy = "prefix-all" | "prefix-except-default" | "explicit";

export interface LocaleConfig {
  code: string;
  label: string;
  hreflang?: string;
  pathPrefix?: string;
  direction?: LocaleDirection;
  enabled?: boolean;
}

export interface LocaleRoutingConfig {
  strategy: LocaleRoutingStrategy;
  categoryBasePath?: string;
}

export interface LocalizedRecord {
  /** Falls back to site.defaultLocale for existing single-locale content. */
  locale?: string;
  /** Stable key shared by translations of the same record. */
  translationGroupId?: string;
  /** Exact public path override, including any locale prefix. */
  path?: string;
}

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  starterId?: string;
  enabledPacks?: string[];
  clientExtensions?: ClientExtensionManifest[];
  editorMode?: EditorMode;
  logo?: string;
  favicon?: string;
  defaultLocale: string;
  locales?: LocaleConfig[];
  localeRouting?: LocaleRoutingConfig;
  localeMessages?: Record<string, Partial<{
    mainNavigation: string;
    mobileNavigation: string;
    footerNavigation: string;
    menu: string;
    home: string;
    page: string;
  }>>;
  defaultTitlePattern: string;
  defaultDescription: string;
  defaultOgImage: string;
  design?: DesignConfig;
  enabledFeatures?: EnabledFeatures;
  organization: OrganizationConfig;
  socialProfiles: string[];
}

export interface BaseContent extends LocalizedRecord {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  templateId?: string;
  seo: SEOData;
  blocks: BlockData[];
  updatedAt: string;
}

export interface PageContent extends BaseContent {
  kind: "page";
  name?: string;
  parentId?: string | null;
  order: number;
  showInNavigation: boolean;
  navigationLabel?: string;
}

export type FieldType =
  | "text"
  | "textarea"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "image"
  | "url";

export type ClientExtensionFieldDefinition = {
  id: string;
  label: string;
  type: FieldType | "select";
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ label: string; value: string }>;
};

export type ClientExtensionBlockManifest = {
  type: `CUSTOM:${string}`;
  label: string;
  shortLabel?: string;
  description?: string;
  category?: string;
  order?: number;
  viewModule: string;
  defaultContent: Record<string, unknown>;
  fields: ClientExtensionFieldDefinition[];
};

export type ClientExtensionManifest = {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  repository?: string;
  blocks: ClientExtensionBlockManifest[];
};

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
}

export interface CollectionDefinition extends LocalizedRecord {
  id: string;
  name: string;
  singularName: string;
  routeParentId?: string | null;
  slug: string;
  description: string;
  preset: "article" | "docs" | "product" | "case-study" | "person" | "landing" | "generic";
  schemaType: SchemaType;
  entryTemplateId?: string;
  indexTemplateId?: string;
  hasBlocks: boolean;
  publicIndex: boolean;
  seo: SEOData;
  fields: FieldDefinition[];
  categoryIds: string[];
  updatedAt: string;
}

export interface CollectionEntry extends BaseContent {
  kind: "collectionEntry";
  collectionId: string;
  excerpt?: string;
  author?: string;
  publishedAt?: string;
  categoryIds: string[];
  fields: Record<string, any>;
}

export interface Category extends LocalizedRecord {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description: string;
  indexTemplateId?: string;
  publicIndex: boolean;
  collectionIds: string[];
  seo: SEOData;
  updatedAt: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  targetType: "page" | "entry" | "collection" | "category" | "url";
  targetId?: string;
  href?: string;
  children?: NavigationItem[];
}

export interface NavigationMenu extends Omit<LocalizedRecord, "path"> {
  id: string;
  name: string;
  location: "header" | "footer";
  items: NavigationItem[];
}

export interface AssetMeta {
  id: string;
  url: string;
  filename: string;
  storageProvider?: "local" | "github" | "supabase" | "external";
  storagePath?: string;
  bucket?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  alt: string;
  folder?: string;
  tags?: string[];
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
  focalPoint?: {
    x: number;
    y: number;
  };
}

export interface RedirectRule {
  id: string;
  from: string;
  to: string;
  status: 301 | 302;
}

export interface ContentGraph {
  version: 1;
  updatedAt: string;
  site: SiteConfig;
  pages: PageContent[];
  collectionDefinitions: CollectionDefinition[];
  entries: CollectionEntry[];
  categories: Category[];
  sharedBlocks: SharedBlock[];
  navigation: NavigationMenu[];
  assets: AssetMeta[];
  redirects: RedirectRule[];
  customBlueprints?: ContentBlueprintDefinition[];
  blueprintAssignments?: BlueprintAssignment[];
}

export interface ValidationIssue {
  id: string;
  level: "error" | "warning";
  scope: "seo" | "routing" | "content" | "auth" | "assets";
  message: string;
  targetId?: string;
}

export interface EditorState {
  currentPage: PageContent;
  activeBlockId: string | null;
  isPreviewMode: boolean;
  isAIProcessing: boolean;
  currentView: ViewType;
}

export type PageData = PageContent;
