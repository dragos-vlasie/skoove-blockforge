export type AppPackDefinition = {
  id: string;
  label: string;
  description: string;
  routes?: string[];
  databaseSchemaPath?: string;
};
