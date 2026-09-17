import type { AppPackDefinition } from "./types";

export const appPackDefinitions: AppPackDefinition[] = [];

export const getAppPackDefinition = (id: string) => appPackDefinitions.find((appPack) => appPack.id === id);
