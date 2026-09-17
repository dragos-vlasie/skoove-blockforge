import type {
  CollectionDefinition,
  CollectionEntry,
  ContentGraph,
  PageContent,
} from "../../types";
import { getBlockPackRegistration, getEnabledPatterns } from "../packs/registry";
import type {
  PackId,
  PackPatternDefinition,
  PatternCategory,
  PatternSignal,
  PatternSubjectKind,
} from "../packs/types";
import { getEntryPath, getPagePath } from "../lib/cms/routing";
import { resolveEntryTemplateId, resolvePageTemplateId } from "../templates/registry";

type AssessmentSubject = PageContent | CollectionEntry;

type SubjectContext = {
  subject: AssessmentSubject;
  kind: PatternSubjectKind;
  route: string;
  title: string;
  templateId: string;
  schemaType: string;
  blockTypes: string[];
  fieldIds: string[];
  collection?: CollectionDefinition;
};
export type PatternEvidence = {
  label: string;
  weight: number;
};

export type PatternAlternative = {
  patternId: string;
  patternName: string;
  packId: PackId;
  packName: string;
  confidence: number;
};

export type SubjectPatternAssessment = {
  subjectId: string;
  subjectKind: PatternSubjectKind;
  title: string;
  route: string;
  collectionName?: string;
  structureSignature: string;
  patternId: string | null;
  patternName: string;
  patternDescription?: string;
  patternCategory?: PatternCategory;
  packId?: PackId;
  packName?: string;
  confidence: number;
  confidenceLevel: "high" | "review" | "custom";
  evidence: PatternEvidence[];
  alternatives: PatternAlternative[];
};

export type PatternCluster = {
  id: string;
  label: string;
  count: number;
  subjectIds: string[];
  patternName: string;
};

export type ContentPatternAssessment = {
  generatedAt: string;
  totalSubjects: number;
  matchedSubjects: number;
  highConfidenceSubjects: number;
  reviewSubjects: number;
  customSubjects: number;
  subjects: SubjectPatternAssessment[];
  clusters: PatternCluster[];
  patternCounts: Array<{
    patternId: string;
    patternName: string;
    packId?: PackId;
    packName?: string;
    count: number;
  }>;
};

type ScoredPattern = {
  definition: PackPatternDefinition & { packId: PackId; packName: string };
  confidence: number;
  evidence: PatternEvidence[];
};

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const roundConfidence = (value: number) =>
  Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;

const matchesText = (
  actualValue: string,
  expectedValues: readonly string[],
  mode: "contains" | "exact" | "prefix" = "contains",
) => {
  const actual = normalize(actualValue);
  return expectedValues.some((value) => {
    const expected = normalize(value);
    if (mode === "exact") return actual === expected;
    if (mode === "prefix") return actual.startsWith(expected);
    return actual.includes(expected);
  });
};

const matchesSignal = (signal: PatternSignal, context: SubjectContext) => {
  switch (signal.type) {
    case "block": {
      const presentTypes = new Set(context.blockTypes);
      return (signal.match ?? "any") === "all"
        ? signal.values.every((value) => presentTypes.has(value))
        : signal.values.some((value) => presentTypes.has(value));
    }
    case "collection-name":
      return matchesText(context.collection?.name ?? "", signal.values, signal.match);
    case "collection-slug":
      return matchesText(context.collection?.slug ?? "", signal.values, signal.match);
    case "collection-preset":
      return signal.values.some((value) => normalize(value) === normalize(context.collection?.preset));
    case "field": {
      const fieldIds = new Set(context.fieldIds.map(normalize));
      return (signal.match ?? "any") === "all"
        ? signal.values.every((value) => fieldIds.has(normalize(value)))
        : signal.values.some((value) => fieldIds.has(normalize(value)));
    }
    case "route":
      return matchesText(context.route, signal.values, signal.match);
    case "schema":
      return signal.values.some((value) => normalize(value) === normalize(context.schemaType));
    case "template":
      return signal.values.some((value) => normalize(value) === normalize(context.templateId));
    case "title":
      return matchesText(context.title, signal.values, signal.match);
  }
};

const buildSubjectContext = (
  subject: AssessmentSubject,
  graph: ContentGraph,
): SubjectContext => {
  if (subject.kind === "page") {
    return {
      subject,
      kind: "page",
      route: getPagePath(subject, graph),
      title: subject.title,
      templateId: resolvePageTemplateId(subject),
      schemaType: subject.seo.schemaType ?? "WebPage",
      blockTypes: subject.blocks.map((block) => block.type),
      fieldIds: [],
    };
  }

  const collection = graph.collectionDefinitions.find(
    (definition) => definition.id === subject.collectionId,
  );

  return {
    subject,
    kind: "entry",
    route: getEntryPath(subject, collection, graph),
    title: subject.title,
    templateId: resolveEntryTemplateId(subject, collection),
    schemaType: subject.seo.schemaType ?? collection?.schemaType ?? "WebPage",
    blockTypes: subject.blocks.map((block) => block.type),
    fieldIds: Array.from(
      new Set([
        ...Object.keys(subject.fields),
        ...(collection?.fields.map((field) => field.id) ?? []),
      ]),
    ),
    collection,
  };
};

const scorePattern = (
  definition: PackPatternDefinition & { packId: PackId; packName: string },
  context: SubjectContext,
): ScoredPattern | null => {
  if (definition.subject !== context.kind) return null;

  const totalWeight = definition.signals.reduce((total, signal) => total + signal.weight, 0);
  if (totalWeight <= 0) return null;

  const evidence = definition.signals
    .filter((signal) => matchesSignal(signal, context))
    .map((signal) => ({ label: signal.label, weight: signal.weight }));
  const matchedWeight = evidence.reduce((total, item) => total + item.weight, 0);

  return {
    definition,
    confidence: roundConfidence(matchedWeight / totalWeight),
    evidence,
  };
};

const formatBlockType = (blockType: string) =>
  getBlockPackRegistration(blockType)?.registration.name ??
  blockType
    .replace(/^(VIET|RENTAL|UI)_/, "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildStructureSignature = (context: SubjectContext) =>
  [
    context.kind,
    context.templateId,
    context.blockTypes.length > 0 ? context.blockTypes.join(">") : "no-blocks",
  ].join("|");

const buildStructureLabel = (context: SubjectContext) => {
  if (context.blockTypes.length === 0) return `No sections · ${context.templateId}`;
  const labels = context.blockTypes.map(formatBlockType);
  const visible = labels.slice(0, 4).join(" → ");
  return labels.length > 4 ? `${visible} +${labels.length - 4}` : visible;
};

export const assessContentPatterns = (graph: ContentGraph): ContentPatternAssessment => {
  const patterns = getEnabledPatterns(graph.site.enabledPacks);
  const contexts = [...graph.pages, ...graph.entries].map((subject) =>
    buildSubjectContext(subject, graph),
  );

  const subjects = contexts.map<SubjectPatternAssessment>((context) => {
    const scored = patterns
      .map((pattern) => scorePattern(pattern, context))
      .filter((result): result is ScoredPattern => Boolean(result))
      .sort((a, b) => b.confidence - a.confidence);
    const best = scored.find(
      (candidate) => candidate.confidence >= candidate.definition.minimumConfidence,
    );
    const confidence = best?.confidence ?? 0;
    const confidenceLevel =
      !best ? "custom" : confidence >= 0.75 ? "high" : "review";

    return {
      subjectId: context.subject.id,
      subjectKind: context.kind,
      title: context.subject.title,
      route: context.route,
      collectionName: context.collection?.name,
      structureSignature: buildStructureSignature(context),
      patternId: best?.definition.id ?? null,
      patternName: best?.definition.name ?? "Custom page",
      patternDescription: best?.definition.description,
      patternCategory: best?.definition.category,
      packId: best?.definition.packId,
      packName: best?.definition.packName,
      confidence,
      confidenceLevel,
      evidence: best?.evidence ?? [],
      alternatives: scored
        .filter((candidate) => candidate !== best && candidate.confidence > 0)
        .slice(0, 2)
        .map((candidate) => ({
          patternId: candidate.definition.id,
          patternName: candidate.definition.name,
          packId: candidate.definition.packId,
          packName: candidate.definition.packName,
          confidence: candidate.confidence,
        })),
    };
  });

  const clusterMap = new Map<string, {
    label: string;
    subjectIds: string[];
    patternName: string;
  }>();
  contexts.forEach((context, index) => {
    const signature = buildStructureSignature(context);
    const item = clusterMap.get(signature) ?? {
      label: buildStructureLabel(context),
      subjectIds: [],
      patternName: subjects[index]?.patternName ?? "Custom page",
    };
    item.subjectIds.push(context.subject.id);
    clusterMap.set(signature, item);
  });

  const patternCountMap = new Map<string, ContentPatternAssessment["patternCounts"][number]>();
  subjects.forEach((subject) => {
    const key = subject.patternId ?? "custom";
    const item = patternCountMap.get(key) ?? {
      patternId: key,
      patternName: subject.patternName,
      packId: subject.packId,
      packName: subject.packName,
      count: 0,
    };
    item.count += 1;
    patternCountMap.set(key, item);
  });

  return {
    generatedAt: new Date().toISOString(),
    totalSubjects: subjects.length,
    matchedSubjects: subjects.filter((subject) => subject.patternId).length,
    highConfidenceSubjects: subjects.filter((subject) => subject.confidenceLevel === "high").length,
    reviewSubjects: subjects.filter((subject) => subject.confidenceLevel === "review").length,
    customSubjects: subjects.filter((subject) => subject.confidenceLevel === "custom").length,
    subjects: subjects.sort((a, b) => {
      if (a.confidenceLevel !== b.confidenceLevel) {
        const order = { review: 0, custom: 1, high: 2 };
        return order[a.confidenceLevel] - order[b.confidenceLevel];
      }
      return a.route.localeCompare(b.route);
    }),
    clusters: Array.from(clusterMap.entries())
      .map(([id, cluster]) => ({
        id,
        label: cluster.label,
        count: cluster.subjectIds.length,
        subjectIds: cluster.subjectIds,
        patternName: cluster.patternName,
      }))
      .sort((a, b) => b.count - a.count),
    patternCounts: Array.from(patternCountMap.values()).sort((a, b) => b.count - a.count),
  };
};
