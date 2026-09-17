import { heroBlock, textBlock } from "../blocks/presets";
import { ensurePage, setBaseBrand, setHeaderNavigation } from "./helpers";
import type { StarterDefinition } from "./types";

export const blankStarter: StarterDefinition = {
  id: "blank",
  label: "Blank Site",
  description: "One clean home page with editable header, footer, media, SEO, and blocks.",
  bestFor: "Simple sites, landing pages, or custom builds.",
  pages: ["Home"],
  apply(graph) {
    setBaseBrand(graph, {
      name: "New Website",
      description: "A clean website built with structured content.",
      themeId: "clean-saas",
      primaryColor: "#2563eb",
      accentColor: "#7c3aed",
    });
    const home = ensurePage(graph, {
      id: "page-home",
      title: "Home",
      slug: "/",
      order: 0,
      description: "A clean website built with structured content.",
      blocks: [
        heroBlock(
          "Build a clear website",
          "Start with a focused page, clean sections, and structured content you can safely edit.",
          "Start editing",
          "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80",
        ),
        textBlock("Make it yours", "Change the copy, upload your images, adjust the navigation, and publish when ready."),
      ],
    });
    setHeaderNavigation(graph, [home]);
    graph.site.enabledFeatures = { ...graph.site.enabledFeatures, mediaLibrary: true, sharedBlocks: true };
  },
};
