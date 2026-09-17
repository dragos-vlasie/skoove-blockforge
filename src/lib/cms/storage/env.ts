type StoreEnv = Record<string, string | undefined>;

export const readRuntimeEnv = (): StoreEnv => ({ ...process.env });
