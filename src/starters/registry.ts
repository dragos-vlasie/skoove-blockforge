import type { ContentGraph } from "../../types";
import { now } from "../cms/contentUtils";
import { agencyStarter } from "./agency";
import { blankStarter } from "./blank";
import { blogStarter } from "./blog";
import { journalBlogStarter } from "./journalBlog";
import { launchSaasStarter } from "./launchSaas";
import { localBusinessStarter } from "./localBusiness";
import { portfolioStarter } from "./portfolio";
import { studioAgencyStarter } from "./studioAgency";
import type { StarterDefinition } from "./types";

export type { StarterDefinition } from "./types";

export const starterDefinitions: StarterDefinition[] = [
  blankStarter,
  blogStarter,
  launchSaasStarter,
  studioAgencyStarter,
  journalBlogStarter,
  agencyStarter,
  portfolioStarter,
  localBusinessStarter,
];

export const applyStarterToGraph = (graph: ContentGraph, starterId: string) => {
  const starter = starterDefinitions.find((candidate) => candidate.id === starterId);
  if (!starter) return;
  graph.site.starterId = starter.id;
  starter.apply(graph);
  graph.updatedAt = now();
};
