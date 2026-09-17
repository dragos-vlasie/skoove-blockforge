import {
  type BlueprintCategory,
  type CollectionDefinition,
  type CollectionEntry,
  type ContentBlueprintDefinition,
  type PageContent,
} from "../../types";
import { cloneDefaultBlockContent } from "../blocks/registry";
import { clone, createId } from "../cms/contentUtils";
import { getEnabledBlueprints } from "../packs/registry";

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .trim();

export const blueprintMatchesCollection = (
  blueprint: ContentBlueprintDefinition,
  definition?: CollectionDefinition | null,
) => {
  if (blueprint.subject !== "entry") return false;
  if (!definition) return true;
  if (!blueprint.collectionMatch) return true;

  const searchable = normalize(
    `${definition.id} ${definition.name} ${definition.singularName} ${definition.slug}`,
  );
  const terms = blueprint.collectionMatch.terms ?? [];
  if (terms.length > 0) {
    return terms.some((term) => searchable.includes(normalize(term)));
  }

  return blueprint.collectionMatch.presets?.includes(definition.preset) ?? false;
};

export const getBlueprintsForCreation = (
  enabledPacks: readonly string[] | undefined,
  customBlueprints: readonly ContentBlueprintDefinition[] | undefined,
  subject: "page" | "entry",
  definition?: CollectionDefinition | null,
) =>
  getEnabledBlueprints(enabledPacks, customBlueprints)
    .filter((blueprint) => blueprint.subject === subject)
    .filter((blueprint) =>
      subject === "entry" ? blueprintMatchesCollection(blueprint, definition) : true,
    );

export const createBlocksFromBlueprint = (
  blueprint: ContentBlueprintDefinition,
  context: {
    title?: string;
    fields?: Record<string, any>;
    collection?: CollectionDefinition | null;
  } = {},
) =>
  blueprint.blocks.map((block) => ({
    id: createId("block"),
    type: block.type,
    content: {
      ...cloneDefaultBlockContent(block.type),
      ...(block.content ? resolveBlueprintTokens(clone(block.content), context) : {}),
    },
  }));

const tokenValue = (
  token: string,
  context: {
    title?: string;
    fields?: Record<string, any>;
    collection?: CollectionDefinition | null;
  },
) => {
  if (token === "title") return context.title ?? "";
  if (token === "collection.id") return context.collection?.id ?? "";
  if (token === "collection.name") return context.collection?.name ?? "";
  if (token.startsWith("fields.")) {
    return context.fields?.[token.slice("fields.".length)] ?? "";
  }
  return "";
};

const resolveBlueprintTokens = (
  value: any,
  context: {
    title?: string;
    fields?: Record<string, any>;
    collection?: CollectionDefinition | null;
  },
): any => {
  if (typeof value === "string") {
    const exact = value.match(/^\{\{([^}]+)\}\}$/);
    if (exact) return tokenValue(exact[1].trim(), context);
    return value.replace(/\{\{([^}]+)\}\}/g, (_match, token) =>
      String(tokenValue(String(token).trim(), context)),
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveBlueprintTokens(item, context));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveBlueprintTokens(item, context),
      ]),
    );
  }
  return value;
};

export const createCustomBlueprint = (
  subject: PageContent | CollectionEntry,
  input: {
    name: string;
    description: string;
    outcome: string;
    category?: BlueprintCategory;
    patternId?: string;
  },
): ContentBlueprintDefinition => ({
  id: createId("blueprint"),
  name: input.name,
  description: input.description,
  outcome: input.outcome,
  subject: subject.kind === "page" ? "page" : "entry",
  category: input.category ?? "landing",
  source: "custom",
  patternId: input.patternId,
  templateId: subject.templateId ?? "landing-page",
  blocks: subject.blocks.map((block) => ({
    type: block.type,
    content: clone(block.content),
  })),
  preview: {
    eyebrow: "Custom layout",
    title: input.name,
    description: input.outcome,
    tone: "neutral",
  },
  sourceSubjectId: subject.id,
  createdAt: new Date().toISOString(),
});
