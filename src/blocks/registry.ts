import { BlockType, type BlockTypeId, type ClientExtensionManifest } from "../../types";
import { getBlockPackId, getBlockPackRegistration, isBlockTypeEnabled } from "../packs/registry";
import { getClientExtensionBlockDefinitions } from "../extensions/manifest";
import type { BlockDefinition, BlockEditorField } from "./types";
import { nextBlockEntries } from "./nextRegistry";

export type { BlockDefinition, BlockEditorField, BlockPresetDefinition } from "./types";

export const blockEntries = [
  ...nextBlockEntries,
]
  .sort((a, b) => a.definition.order - b.definition.order);

export const blockDefinitions: BlockDefinition[] = blockEntries.map(({ definition }) => ({
  ...definition,
  packId: (definition as BlockDefinition).packId ?? getBlockPackId(definition.type),
}));

export const blockFoldersByType = Object.fromEntries(
  blockEntries.map(({ folder, definition }) => [definition.type, folder]),
) as unknown as Record<BlockType, string>;

export const blockModuleRootsByType = Object.fromEntries(
  blockEntries.map(({ moduleRoot, definition }) => [definition.type, moduleRoot]),
) as unknown as Record<BlockType, string>;

export const blockRegistry = Object.fromEntries(
  blockDefinitions.map((definition) => [definition.type, definition]),
) as unknown as Record<BlockType, BlockDefinition>;

blockFoldersByType[BlockType.VIDEO_EMBED] ??= "video-embed";
blockFoldersByType[BlockType.TABLE] ??= "table";
blockModuleRootsByType[BlockType.VIDEO_EMBED] ??= "./video-embed";
blockModuleRootsByType[BlockType.TABLE] ??= "./table";

export const cloneBlockValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const cloneDefaultBlockContent = (
  type: BlockTypeId,
  clientExtensions: readonly ClientExtensionManifest[] = [],
) => cloneBlockValue(getBlockDefinition(type, clientExtensions)?.defaultContent ?? {});

export const createBlockContentFromPreset = (type: BlockType, presetId?: string) => {
  const definition = blockRegistry[type];
  const preset = definition.presets?.find((candidate) => candidate.id === presetId);

  return {
    ...cloneBlockValue(definition.defaultContent),
    ...(preset ? cloneBlockValue(preset.content) : {}),
  };
};

export const getBlockDefinition = (
  type: BlockTypeId,
  clientExtensions: readonly ClientExtensionManifest[] = [],
) => blockRegistry[type as BlockType] ?? getClientExtensionBlockDefinitions(clientExtensions).find((definition) => definition.type === type);

export const getBlockDefinitionsForPacks = (
  enabledPacks?: readonly string[],
  editorMode: "client" | "builder" = "client",
  clientExtensions: readonly ClientExtensionManifest[] = [],
) => {
  const sharedDefinitions = editorMode === "builder"
    ? blockDefinitions
    : blockDefinitions.filter((definition) => {
        if (!isBlockTypeEnabled(definition.type, enabledPacks)) return false;
        const registration = getBlockPackRegistration(definition.type)?.registration;
        return registration?.classification === "component" && !registration.legacy;
      });

  return [...sharedDefinitions, ...getClientExtensionBlockDefinitions(clientExtensions)]
    .sort((a, b) => a.order - b.order);
};
