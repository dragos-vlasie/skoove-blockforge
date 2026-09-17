import type { ContentGraph } from "../../types";

export type StarterDefinition = {
  id: string;
  label: string;
  description: string;
  bestFor: string;
  pages: string[];
  advanced?: boolean;
  apply: (graph: ContentGraph) => void;
};
