import { ctaBlock, heroBlock, textBlock } from "../blocks/presets";
import { ensurePage, setBaseBrand, setHeaderNavigation } from "./helpers";
import type { StarterDefinition } from "./types";

export const portfolioStarter: StarterDefinition = {
  id: "portfolio",
  label: "Portfolio",
  description: "Personal or studio portfolio with work, about, and contact pages.",
  bestFor: "Designers, developers, photographers, writers, and creators.",
  pages: ["Home", "Work", "About", "Contact"],
  apply(graph) {
    setBaseBrand(graph, {
      name: "Studio Portfolio",
      description: "A clean portfolio for showing selected work and getting inquiries.",
      themeId: "portfolio-vivid",
      primaryColor: "#4f46e5",
      accentColor: "#f43f5e",
    });
    const home = ensurePage(graph, {
      id: "page-home",
      title: "Home",
      slug: "/",
      order: 0,
      description: "A clean portfolio for showing selected work and getting inquiries.",
      blocks: [
        heroBlock(
          "Selected work with a clear point of view",
          "Use this starter to show projects, process, and ways to work together.",
          "View work",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80",
        ),
        textBlock("Featured projects", "Add galleries, case studies, or project summaries using reusable blocks."),
      ],
    });
    const work = ensurePage(graph, {
      title: "Work",
      slug: "work",
      order: 1,
      description: "Browse selected projects.",
      blocks: [textBlock("Work", "Show your best projects with context, outcomes, images, and links.")],
    });
    const about = ensurePage(graph, {
      title: "About",
      slug: "about",
      order: 2,
      description: "Learn about the person or studio.",
      blocks: [textBlock("About", "Explain your background, skills, values, and what kind of projects you take on.")],
    });
    const contact = ensurePage(graph, {
      title: "Contact",
      slug: "contact",
      order: 3,
      description: "Start a project or send an inquiry.",
      blocks: [ctaBlock("Let's work together", "Share the easiest way for visitors to reach you.", "Get in touch")],
    });
    setHeaderNavigation(graph, [home, work, about, contact]);
    graph.site.enabledFeatures = { ...graph.site.enabledFeatures, mediaLibrary: true, sharedBlocks: true };
  },
};
