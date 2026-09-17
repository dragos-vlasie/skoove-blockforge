import type { ContentBlueprintDefinition } from "../../types";
import carRentalPackManifest from "./car-rental/manifest";
import corePackManifest from "./core/manifest";
import editorialPublicationPackManifest from "./editorial-publication/manifest";
import travelAgencyPackManifest from "./travel-agency/manifest";
import type { PackBlockRegistration, PackId, PackManifest, PackPatternDefinition } from "./types";

export type {
  PackBlockClassification,
  PackBlockRegistration,
  PackBlockVisualKind,
  PackId,
  PackManifest,
  PackPatternDefinition,
  PatternCategory,
  PatternSignal,
  PatternSubjectKind,
} from "./types";

export const packManifests: readonly PackManifest[] = [
  corePackManifest,
  editorialPublicationPackManifest,
  carRentalPackManifest,
  travelAgencyPackManifest,
];

export const packRegistry = Object.fromEntries(
  packManifests.map((manifest) => [manifest.id, manifest]),
) as unknown as Record<PackId, PackManifest>;

const blockRegistrationByType = new Map<string, {
  packId: PackId;
  registration: PackBlockRegistration;
}>();

for (const manifest of packManifests) {
  for (const registration of manifest.blocks) {
    if (blockRegistrationByType.has(registration.type)) {
      throw new Error(`Block type "${registration.type}" is registered by more than one pack.`);
    }

    blockRegistrationByType.set(registration.type, {
      packId: manifest.id,
      registration,
    });
  }
}

export const installedPackIds = packManifests.map((manifest) => manifest.id);

export const getPackManifest = (packId: string) =>
  packManifests.find((manifest) => manifest.id === packId);

export const getBlockPackRegistration = (blockType: string) =>
  blockRegistrationByType.get(blockType);

export const getBlockPackId = (blockType: string): PackId | undefined =>
  getBlockPackRegistration(blockType)?.packId;

export const getEnabledPatterns = (
  enabledPacks?: readonly string[],
): Array<PackPatternDefinition & { packId: PackId; packName: string }> => {
  const enabledPackIds = resolveEnabledPackIds(enabledPacks);

  return packManifests.flatMap((manifest) =>
    enabledPackIds.has(manifest.id)
      ? (manifest.patterns ?? []).map((pattern) => ({
          ...pattern,
          packId: manifest.id,
          packName: manifest.name,
        }))
      : [],
  );
};

export const getEnabledBlueprints = (
  enabledPacks?: readonly string[],
  customBlueprints: readonly ContentBlueprintDefinition[] = [],
) => {
  const enabledPackIds = resolveEnabledPackIds(enabledPacks);
  const packBlueprints = packManifests.flatMap((manifest) =>
    enabledPackIds.has(manifest.id) ? [...(manifest.blueprints ?? [])] : [],
  );

  return [...packBlueprints, ...customBlueprints];
};

export const getBlueprint = (
  blueprintId: string,
  enabledPacks?: readonly string[],
  customBlueprints: readonly ContentBlueprintDefinition[] = [],
) =>
  getEnabledBlueprints(enabledPacks, customBlueprints).find(
    (blueprint) => blueprint.id === blueprintId,
  );

export const getEnabledCollectionPresets = (enabledPacks?: readonly string[]) => {
  const enabledPackIds = resolveEnabledPackIds(enabledPacks);

  return packManifests.flatMap((manifest) =>
    enabledPackIds.has(manifest.id) ? [...(manifest.collectionPresets ?? [])] : [],
  );
};

export const resolveEnabledPackIds = (enabledPacks?: readonly string[]) => {
  if (!enabledPacks) return new Set<string>(installedPackIds);
  return new Set(enabledPacks);
};

export const isBlockTypeEnabled = (
  blockType: string,
  enabledPacks?: readonly string[],
) => {
  const packId = getBlockPackId(blockType);
  if (!packId) return false;
  return resolveEnabledPackIds(enabledPacks).has(packId);
};
