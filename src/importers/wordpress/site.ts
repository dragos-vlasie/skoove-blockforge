import type { WordPressClient } from "./client";
import { normalizeWordPressEntity, resolveEmbeddedEntityData } from "./normalize";
import type {
  NormalizedWordPressDocument,
  WordPressEntity,
  WordPressEntityKind,
  WordPressMedia,
  WordPressSiteImport,
  WordPressTerm,
  WordPressUser,
  WordPressLocalizationAdapter,
} from "./types";

export type ImportWordPressSiteOptions = {
  include?: readonly WordPressEntityKind[];
  limit?: number;
  localizationAdapter?: WordPressLocalizationAdapter;
  onProgress?: (completed: number, total: number, entity: WordPressEntity) => void;
};

const pathnameFor = (value: string, fallback: string) => {
  try {
    const path = new URL(value).pathname;
    return path === "/" ? path : `${path.replace(/\/+$/, "")}/`;
  } catch {
    return `/${fallback.replace(/^\/+|\/+$/g, "")}/`;
  }
};

const mapsById = <T extends { id: number }>(values: readonly T[]) =>
  new Map(values.map((value) => [value.id, value]));

const hydrate = async ({
  client,
  entity,
  kind,
  categories,
  tags,
  users,
  localizationAdapter,
}: {
  client: WordPressClient;
  entity: WordPressEntity;
  kind: WordPressEntityKind;
  categories: Map<number, WordPressTerm>;
  tags: Map<number, WordPressTerm>;
  users: Map<number, WordPressUser>;
  localizationAdapter?: WordPressLocalizationAdapter;
}) => {
  const embedded = resolveEmbeddedEntityData(entity);
  const author = embedded.author ?? (entity.author ? users.get(entity.author) : undefined);
  let featuredMedia: WordPressMedia | null | undefined = embedded.featuredMedia;

  if (!featuredMedia && entity.featured_media) {
    try {
      featuredMedia = await client.getMedia(entity.featured_media);
    } catch {
      featuredMedia = null;
    }
  }

  const translationGroupId = await localizationAdapter?.resolveTranslationGroup?.({
    entity,
    kind,
    locale: client.locale,
  });

  return normalizeWordPressEntity({
    entity,
    kind,
    siteUrl: client.siteUrl,
    author,
    featuredMedia,
    categories: embedded.categories.length
      ? embedded.categories
      : (entity.categories ?? []).flatMap((id) => categories.get(id) ?? []),
    tags: embedded.tags.length
      ? embedded.tags
      : (entity.tags ?? []).flatMap((id) => tags.get(id) ?? []),
    locale: client.locale,
    translationGroupId,
  });
};

export async function importWordPressSite(
  client: WordPressClient,
  options: ImportWordPressSiteOptions = {},
): Promise<{ siteImport: WordPressSiteImport; sourceEntities: WordPressEntity[] }> {
  const include = new Set(options.include ?? ["post", "page"]);
  const [posts, pages, categories, tags, users] = await Promise.all([
    include.has("post") ? client.getAll<WordPressEntity>("posts", { _embed: true, status: "publish" }) : [],
    include.has("page") ? client.getAll<WordPressEntity>("pages", { _embed: true, status: "publish" }) : [],
    client.getCategories(),
    client.getTags(),
    client.getUsers(),
  ]);

  const sourceEntities = [
    ...posts.map((entity) => ({ ...entity, type: "post" })),
    ...pages.map((entity) => ({ ...entity, type: "page" })),
  ].slice(0, options.limit && options.limit > 0 ? options.limit : undefined);
  const categoryMap = mapsById(categories);
  const tagMap = mapsById(tags);
  const userMap = mapsById(users);
  const documents: NormalizedWordPressDocument[] = [];
  const failures: WordPressSiteImport["failures"] = [];

  for (const [index, entity] of sourceEntities.entries()) {
    const kind: WordPressEntityKind = entity.type === "page" ? "page" : "post";
    try {
      documents.push(
        await hydrate({
          client,
          entity,
          kind,
          categories: categoryMap,
          tags: tagMap,
          users: userMap,
          localizationAdapter: options.localizationAdapter,
        }),
      );
    } catch (error) {
      failures.push({
        kind,
        id: entity.id,
        slug: entity.slug,
        sourceUrl: entity.link ?? "",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    options.onProgress?.(index + 1, sourceEntities.length, entity);
  }

  const routes = documents.map((document) => {
    const sourcePath = pathnameFor(document.source.sourceUrl, document.slug);
    // Preserve the original public URL in the first migration pass. Any deliberate
    // information-architecture change can then be represented as an explicit redirect.
    const targetPath = sourcePath;
    return {
      kind: document.kind,
      sourceId: document.source.entityId,
      sourceUrl: document.source.sourceUrl,
      sourcePath,
      targetPath,
      redirectRequired: sourcePath !== targetPath,
    };
  });

  const summary = {
    requested: sourceEntities.length,
    imported: documents.length,
    failed: failures.length,
    blocks: documents.reduce((total, document) => total + document.blocks.length, 0),
    linkedMedia: documents.reduce((total, document) => total + document.linkedMedia.length, 0),
    blockingIssues: documents.reduce(
      (total, document) => total + document.issues.filter((issue) => issue.severity === "blocking").length,
      0,
    ),
    warningIssues: documents.reduce(
      (total, document) => total + document.issues.filter((issue) => issue.severity === "warning").length,
      0,
    ),
  };

  return {
    sourceEntities,
    siteImport: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      siteUrl: client.siteUrl,
      mediaMode: "linked",
      documents,
      failures,
      routes,
      summary,
    },
  };
}
