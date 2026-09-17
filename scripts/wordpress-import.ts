#!/usr/bin/env node
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import {
  WordPressClient,
  auditWordPressSite,
  buildWordPressContentGraph,
  importWordPressSite,
  isWordPressMigrationProfile,
  normalizeWordPressEntity,
  resolveEmbeddedEntityData,
  safeSegment,
  writeAuditBundle,
  writeDocumentBundle,
  writeSiteImportBundle,
  writeLocalizationManifest,
  detectWordPressLocalization,
  mergeWordPressAudits,
  type WordPressEntityKind,
  type NormalizedWordPressDocument,
  type WordPressSiteAudit,
  type WordPressTerm,
  type WordPressMigrationProfile,
  type WordPressLocalizationManifest,
  type WordPressSiteImport,
} from "../src/importers/wordpress/index";
import type { ContentGraph } from "../types";

const program = new Command();

program
  .name("wordpress-import")
  .description("Audit and normalize WordPress content for BlockForge without changing the source site.")
  .showHelpAfterError();

const parseSource = (
  source: string,
  requestedKind?: WordPressEntityKind,
  requestedId?: number,
) => {
  const url = new URL(source);
  const apiMatch = url.pathname.match(/\/wp-json\/wp\/v2\/(posts|pages)\/(\d+)/);
  const siteUrl = `${url.protocol}//${url.host}`;
  if (apiMatch) {
    return {
      siteUrl,
      kind: apiMatch[1] === "pages" ? ("page" as const) : ("post" as const),
      id: Number(apiMatch[2]),
    };
  }
  if (!requestedId) {
    throw new Error("Provide --id when the source is a WordPress site URL rather than a post/page API URL.");
  }
  return { siteUrl, kind: requestedKind ?? "post", id: requestedId };
};

const defaultOutput = (siteUrl: string) => {
  const hostname = new URL(siteUrl).hostname.replace(/^www\./, "");
  return resolve("migration-data", safeSegment(hostname));
};

const contentFileName = (id: string) => `${id.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}.json`;
const parseLocales = (value?: string) => value
  ?.split(",")
  .map((locale) => locale.trim())
  .filter(Boolean);

const loadProfile = async (file?: string): Promise<WordPressMigrationProfile | undefined> => {
  if (!file) return undefined;
  const module = await import(pathToFileURL(resolve(file)).href);
  const profile = module.default ?? module.profile;
  if (!isWordPressMigrationProfile(profile)) {
    throw new Error(`WordPress profile ${file} must default-export a valid WordPressMigrationProfile.`);
  }
  return profile;
};

const writeGraphSnapshot = async (directory: string, graph: ContentGraph) => {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records = [
    ["pages", graph.pages],
    ["collections", graph.collectionDefinitions],
    ["entries", graph.entries],
    ["categories", graph.categories],
    ["shared-blocks", graph.sharedBlocks],
    ["navigation", graph.navigation],
    ["assets", graph.assets],
    ["redirects", graph.redirects],
    ["blueprints", graph.customBlueprints ?? []],
    ["blueprint-assignments", graph.blueprintAssignments ?? []],
  ] as const;
  const order = Object.fromEntries(records.map(([key, values]) => [
    key === "collections" ? "collectionDefinitions" : key === "shared-blocks" ? "sharedBlocks" : key === "blueprint-assignments" ? "blueprintAssignments" : key === "blueprints" ? "customBlueprints" : key,
    values.map((value) => value.id),
  ]));

  await Promise.all([
    writeFile(resolve(directory, "_meta.json"), `${JSON.stringify({ version: 1, updatedAt: graph.updatedAt, order }, null, 2)}\n`),
    writeFile(resolve(directory, "site.json"), `${JSON.stringify(graph.site, null, 2)}\n`),
    ...records.flatMap(([folder, values]) => values.map(async (value) => {
      const target = resolve(directory, folder, contentFileName(value.id));
      await mkdir(resolve(directory, folder), { recursive: true });
      await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
    })),
  ]);
};

program
  .command("audit")
  .description("Discover public WordPress content counts, taxonomies, and routes.")
  .argument("<site-url>", "WordPress website URL")
  .option("-o, --output <directory>", "Migration bundle output directory")
  .option("--locales <codes>", "Comma-separated locale codes; otherwise discover from hreflang")
  .option("--default-locale <code>", "Default locale when discovery is ambiguous")
  .action(async (siteUrl: string, options: { output?: string; locales?: string; defaultLocale?: string }) => {
    const manifest = await detectWordPressLocalization(siteUrl, {
      locales: parseLocales(options.locales),
      defaultLocale: options.defaultLocale,
    });
    const audits = await Promise.all(
      manifest.locales.map((locale) => auditWordPressSite(new WordPressClient({ siteUrl, locale: locale.code }))),
    );
    const audit = mergeWordPressAudits(audits);
    const directory = options.output ?? defaultOutput(siteUrl);
    const output = await writeAuditBundle(directory, audit);
    await writeLocalizationManifest(directory, manifest);

    console.log(`WordPress audit written to ${output}`);
    Object.entries(audit.collections).forEach(([name, summary]) => {
      console.log(`${name}: ${summary.total}`);
    });
    console.log(`routes discovered: ${audit.routes.length}`);
    console.log(`locales: ${manifest.locales.map((locale) => `${locale.code} (${locale.rest.posts} posts, ${locale.rest.pages} pages)`).join(", ")}`);
  });

program
  .command("document")
  .description("Normalize one WordPress post or page into editable CMS blocks and a fidelity report.")
  .argument("<source>", "WordPress site URL or direct wp-json post/page URL")
  .option("--kind <kind>", "Entity kind when source is a site URL: post or page", "post")
  .option("--id <id>", "Post or page ID", (value) => Number(value))
  .option("-o, --output <directory>", "Migration bundle output directory")
  .action(
    async (
      source: string,
      options: { kind: string; id?: number; output?: string },
    ) => {
      if (!['post', 'page'].includes(options.kind)) throw new Error("--kind must be post or page");
      const resolved = parseSource(source, options.kind as WordPressEntityKind, options.id);
      const client = new WordPressClient({ siteUrl: resolved.siteUrl });
      const entity = resolved.kind === "post" ? await client.getPost(resolved.id) : await client.getPage(resolved.id);
      const embedded = resolveEmbeddedEntityData(entity);

      const categories = embedded.categories.length
        ? embedded.categories
        : await Promise.all(
            (entity.categories ?? []).map((id) =>
              client.request<WordPressTerm>(`categories/${id}`).then((result) => result.data),
            ),
          );
      const tags = embedded.tags.length
        ? embedded.tags
        : await Promise.all(
            (entity.tags ?? []).map((id) =>
              client.request<WordPressTerm>(`tags/${id}`).then((result) => result.data),
            ),
          );
      const author = embedded.author ?? (entity.author ? await client.getUser(entity.author) : null);
      const featuredMedia =
        embedded.featuredMedia ?? (entity.featured_media ? await client.getMedia(entity.featured_media) : null);
      const document = normalizeWordPressEntity({
        entity,
        kind: resolved.kind,
        siteUrl: resolved.siteUrl,
        author,
        featuredMedia,
        categories,
        tags,
      });
      const output = await writeDocumentBundle({
        outputDirectory: options.output ?? defaultOutput(resolved.siteUrl),
        source: entity,
        document,
      });

      console.log(`WordPress document written to ${output}`);
      console.log(`title: ${document.title}`);
      console.log(`editable blocks: ${document.blocks.length}`);
      console.log(`linked media: ${document.linkedMedia.length}`);
      console.log(`warnings: ${document.issues.filter((issue) => issue.severity === "warning").length}`);
      console.log(`blocking issues: ${document.issues.filter((issue) => issue.severity === "blocking").length}`);
    },
  );

program
  .command("site")
  .description("Normalize all public posts and pages into a reviewable migration bundle.")
  .argument("<site-url>", "WordPress website URL")
  .option("--include <kinds>", "Comma-separated content kinds: post,page", "post,page")
  .option("--limit <count>", "Limit the number of documents for a trial run", (value) => Number(value))
  .option("-o, --output <directory>", "Migration bundle output directory")
  .option("--locales <codes>", "Comma-separated locale codes to import after reviewing wp:audit")
  .option("--default-locale <code>", "Default locale for the generated localization manifest")
  .action(
    async (
      siteUrl: string,
      options: { include: string; limit?: number; output?: string; locales?: string; defaultLocale?: string },
    ) => {
      const include = options.include
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (include.some((kind) => !["post", "page"].includes(kind))) {
        throw new Error("--include accepts only post,page");
      }

      const requestedLocales = parseLocales(options.locales);
      const manifest = await detectWordPressLocalization(siteUrl, {
        locales: requestedLocales,
        defaultLocale: options.defaultLocale,
      });
      const importLocales = requestedLocales?.length ? manifest.locales : [undefined];
      const imports = [] as Array<Awaited<ReturnType<typeof importWordPressSite>>>;
      for (const locale of importLocales) {
        const client = new WordPressClient({ siteUrl, locale: locale?.code });
        imports.push(await importWordPressSite(client, {
          include: include as WordPressEntityKind[],
          limit: options.limit,
          onProgress: (completed, total, entity) => {
            if (completed === total || completed % 10 === 0) {
              console.log(`normalized ${completed}/${total}${locale ? ` [${locale.code}]` : ""}: ${entity.slug}`);
            }
          },
        }));
      }
      const sourceEntities = imports.flatMap((result) => result.sourceEntities);
      const importedSites = imports.map((result) => result.siteImport);
      const summary = importedSites.reduce<WordPressSiteImport["summary"]>((total, current) => ({
        requested: total.requested + current.summary.requested,
        imported: total.imported + current.summary.imported,
        failed: total.failed + current.summary.failed,
        blocks: total.blocks + current.summary.blocks,
        linkedMedia: total.linkedMedia + current.summary.linkedMedia,
        blockingIssues: total.blockingIssues + current.summary.blockingIssues,
        warningIssues: total.warningIssues + current.summary.warningIssues,
      }), { requested: 0, imported: 0, failed: 0, blocks: 0, linkedMedia: 0, blockingIssues: 0, warningIssues: 0 });
      const siteImport: WordPressSiteImport = {
        ...(importedSites[0] ?? {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          siteUrl,
          mediaMode: "linked",
        }),
        documents: importedSites.flatMap((result) => result.documents),
        failures: importedSites.flatMap((result) => result.failures),
        routes: importedSites.flatMap((result) => result.routes),
        summary,
      };
      const directory = options.output ?? defaultOutput(siteUrl);
      const output = await writeSiteImportBundle({
        outputDirectory: directory,
        sourceEntities,
        siteImport,
      });
      const defaultCandidate = manifest.locales.find((locale) => locale.isDefault) ?? manifest.locales[0];
      const importManifest: WordPressLocalizationManifest = requestedLocales?.length
        ? manifest
        : {
            ...manifest,
            defaultLocale: defaultCandidate?.code ?? manifest.defaultLocale,
            locales: defaultCandidate ? [{ ...defaultCandidate, isDefault: true }] : [],
            notes: [
              ...manifest.notes,
              "This site import ran without --locales, so only the default locale is enabled in the generated graph.",
            ],
          };
      await writeLocalizationManifest(directory, importManifest);

      console.log(`WordPress site import written to ${output}`);
      console.log(`documents: ${siteImport.summary.imported}/${siteImport.summary.requested}`);
      console.log(`editable blocks: ${siteImport.summary.blocks}`);
      console.log(`linked media: ${siteImport.summary.linkedMedia}`);
      console.log(`failures: ${siteImport.summary.failed}`);
      console.log(`blocking issues: ${siteImport.summary.blockingIssues}`);
    },
  );

program
  .command("apply")
  .description("Build and apply a CMS content graph from a reviewed WordPress migration bundle.")
  .argument("<bundle-directory>", "Directory containing inventory.json and documents/*.json")
  .option("--draft-only", "Write only the CMS draft snapshot")
  .option("--profile <file>", "Optional installation profile for client-specific branding and composition")
  .option("--content-root <directory>", "Content output root", "content")
  .action(async (
    bundleDirectory: string,
    options: { draftOnly?: boolean; profile?: string; contentRoot: string },
  ) => {
    const directory = resolve(bundleDirectory);
    const audit = JSON.parse(await readFile(resolve(directory, "inventory.json"), "utf8")) as WordPressSiteAudit;
    const documentDirectory = resolve(directory, "documents");
    const files = (await readdir(documentDirectory)).filter((file) => file.endsWith(".json")).sort();
    const documents = await Promise.all(
      files.map(async (file) => JSON.parse(await readFile(resolve(documentDirectory, file), "utf8")) as NormalizedWordPressDocument),
    );
    const profile = await loadProfile(options.profile);
    let localization: WordPressLocalizationManifest | undefined;
    try {
      localization = JSON.parse(await readFile(resolve(directory, "localization.json"), "utf8")) as WordPressLocalizationManifest;
    } catch {
      localization = undefined;
    }
    const graph = buildWordPressContentGraph({ audit, documents, localization }, profile);
    const contentRoot = resolve(options.contentRoot);
    await writeGraphSnapshot(resolve(contentRoot, "draft"), graph);
    if (!options.draftOnly) await writeGraphSnapshot(resolve(contentRoot, "published"), graph);

    console.log(`Applied WordPress migration bundle from ${directory}`);
    console.log(`pages: ${graph.pages.length}`);
    console.log(`entries: ${graph.entries.length}`);
    console.log(`categories: ${graph.categories.length}`);
    console.log(`profile: ${profile?.id ?? "generic"}`);
    console.log(`content root: ${contentRoot}`);
    console.log(`mode: ${options.draftOnly ? "draft only" : "draft and published"}`);
  });

await program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
