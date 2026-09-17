import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  NormalizedWordPressDocument,
  WordPressEntity,
  WordPressSiteAudit,
  WordPressSiteImport,
  WordPressLocalizationManifest,
} from "./types";

const writeJsonAtomic = async (path: string, value: unknown) => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
};

const fragmentSignature = (value: string) =>
  createHash("sha256")
    .update(value.replace(/\s+/g, " ").replace(/user-content-/g, "").trim())
    .digest("hex")
    .slice(0, 16);

const buildMigrationReview = (documents: NormalizedWordPressDocument[]) => {
  const reviewQueue = documents
    .filter((document) => document.issues.some((issue) => issue.severity !== "info"))
    .map((document) => ({
      id: document.id,
      title: document.title,
      sourceUrl: document.source.sourceUrl,
      issues: document.issues.filter((issue) => issue.severity !== "info"),
    }));

  const issueGroups = new Map<
    string,
    {
      code: string;
      signature: string;
      sampleHtml: string;
      occurrences: Array<{ documentId: string; title: string; sourceUrl: string }>;
    }
  >();

  for (const document of documents) {
    for (const issue of document.issues) {
      if (!issue.sourceHtml) continue;
      const signature = fragmentSignature(issue.sourceHtml);
      const key = `${issue.code}:${signature}`;
      const group = issueGroups.get(key) ?? {
        code: issue.code,
        signature,
        sampleHtml: issue.sourceHtml,
        occurrences: [],
      };
      group.occurrences.push({
        documentId: document.id,
        title: document.title,
        sourceUrl: document.source.sourceUrl,
      });
      issueGroups.set(key, group);
    }
  }

  const repeatedFragments = [...issueGroups.values()]
    .filter((group) => group.occurrences.length > 1)
    .sort((left, right) => right.occurrences.length - left.occurrences.length)
    .map((group) => ({
      ...group,
      occurrenceCount: group.occurrences.length,
      recommendation:
        group.occurrences.length >= 3
          ? "Create one reusable mapping or shared section; do not reproduce this fragment per page."
          : "Review once and reuse the same mapping decision for both occurrences.",
    }));

  const issueCodeCounts = documents.reduce<Record<string, number>>((counts, document) => {
    document.issues.forEach((issue) => {
      if (issue.severity !== "info") counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    });
    return counts;
  }, {});

  const patternCandidates = Object.entries(issueCodeCounts)
    .sort(([, left], [, right]) => right - left)
    .map(([code, occurrenceCount]) => ({
      code,
      occurrenceCount,
      scope: occurrenceCount >= 3 ? "reusable-mapping" : "document-review",
      recommendation:
        code === "component.form-unmapped"
          ? "Model the source form as a configurable Core form or one shared signup section."
          : code === "embed.requires-provider-mapping"
            ? "Add a provider adapter that stores the canonical embed URL instead of copied provider HTML."
            : code === "component.cover-unmapped"
              ? "Map the cover composition to Core Hero or Media plus Text after visual review."
              : "Review representative examples and define one deterministic conversion rule.",
    }));

  return { reviewQueue, repeatedFragments, patternCandidates };
};

export const safeSegment = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "wordpress-site";

export async function writeAuditBundle(outputDirectory: string, audit: WordPressSiteAudit) {
  const root = resolve(outputDirectory);
  await writeJsonAtomic(resolve(root, "inventory.json"), audit);
  await writeJsonAtomic(resolve(root, "routes.json"), audit.routes);
  return root;
}

export async function writeLocalizationManifest(
  outputDirectory: string,
  manifest: WordPressLocalizationManifest,
) {
  const root = resolve(outputDirectory);
  await writeJsonAtomic(resolve(root, "localization.json"), manifest);
  return root;
}

export async function writeDocumentBundle({
  outputDirectory,
  source,
  document,
}: {
  outputDirectory: string;
  source: WordPressEntity;
  document: NormalizedWordPressDocument;
}) {
  const root = resolve(outputDirectory);
  const name = `${document.kind}-${document.source.entityId}`;
  await writeJsonAtomic(resolve(root, "source", `${name}.json`), source);
  await writeJsonAtomic(resolve(root, "documents", `${name}.json`), document);
  await writeJsonAtomic(resolve(root, "reports", `${name}.json`), {
    id: document.id,
    sourceUrl: document.source.sourceUrl,
    title: document.title,
    blockCount: document.blocks.length,
    linkedMediaCount: document.linkedMedia.length,
    internalLinkCount: document.links.filter((link) => link.internal).length,
    affiliateLinkCount: document.links.filter((link) => link.affiliate).length,
    issueCounts: {
      blocking: document.issues.filter((issue) => issue.severity === "blocking").length,
      warning: document.issues.filter((issue) => issue.severity === "warning").length,
      info: document.issues.filter((issue) => issue.severity === "info").length,
    },
    stats: document.stats,
    issues: document.issues,
  });
  return root;
}


export async function writeSiteImportBundle({
  outputDirectory,
  sourceEntities,
  siteImport,
}: {
  outputDirectory: string;
  sourceEntities: WordPressEntity[];
  siteImport: WordPressSiteImport;
}) {
  const root = resolve(outputDirectory);
  const review = buildMigrationReview(siteImport.documents);

  await Promise.all(
    sourceEntities.map((source) => {
      const kind = source.type === "page" ? "page" : "post";
      return writeJsonAtomic(resolve(root, "source", `${kind}-${source.id}.json`), source);
    }),
  );
  await Promise.all(
    siteImport.documents.map((document) =>
      writeJsonAtomic(
        resolve(root, "documents", `${document.locale ? `${safeSegment(document.locale)}-` : ""}${document.kind}-${document.source.entityId}.json`),
        document,
      ),
    ),
  );
  await writeJsonAtomic(resolve(root, "import-manifest.json"), {
    schemaVersion: siteImport.schemaVersion,
    generatedAt: siteImport.generatedAt,
    siteUrl: siteImport.siteUrl,
    mediaMode: siteImport.mediaMode,
    summary: siteImport.summary,
    failures: siteImport.failures,
  });
  await writeJsonAtomic(resolve(root, "route-map.json"), siteImport.routes);
  await writeJsonAtomic(
    resolve(root, "reports", "content-fidelity.json"),
    siteImport.documents.map((document) => ({
      id: document.id,
      kind: document.kind,
      sourceId: document.source.entityId,
      sourceUrl: document.source.sourceUrl,
      title: document.title,
      blocks: document.blocks.length,
      linkedMedia: document.linkedMedia.length,
      stats: document.stats,
      styleInventory: document.styleInventory,
      issues: document.issues,
    })),
  );
  await writeJsonAtomic(resolve(root, "reports", "review-queue.json"), review.reviewQueue);
  await writeJsonAtomic(resolve(root, "reports", "repeated-fragments.json"), review.repeatedFragments);
  await writeJsonAtomic(resolve(root, "reports", "pattern-candidates.json"), review.patternCandidates);

  return root;
}
