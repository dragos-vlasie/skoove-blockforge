import { ctaBlock, featuresBlock, heroBlock, textBlock } from "../blocks/presets";
import { ensurePage, setBaseBrand, setHeaderNavigation } from "./helpers";
import type { StarterDefinition } from "./types";

export const agencyStarter: StarterDefinition = {
  id: "agency",
  label: "Agency",
  description: "Service business starter with proof, process, and conversion sections.",
  bestFor: "Studios, consultants, SaaS service teams, and local agencies.",
  pages: ["Home", "Services", "Work", "Contact"],
  apply(graph) {
    setBaseBrand(graph, {
      name: "Northstar Studio",
      description: "A focused service website for teams that sell expertise.",
      themeId: "studio-agency",
      primaryColor: "#111827",
      accentColor: "#14b8a6",
    });
    const home = ensurePage(graph, {
      id: "page-home",
      title: "Home",
      slug: "/",
      order: 0,
      description: "A focused service website for teams that sell expertise.",
      blocks: [
        heroBlock(
          "Strategy, design, and websites that convert",
          "A clear agency starter with services, proof, and calls to action ready to edit.",
          "Book a call",
          "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80",
        ),
        featuresBlock("What we do", [
          { title: "Brand systems", description: "Positioning, messaging, and visual direction." },
          { title: "Web design", description: "Fast, polished pages built from reusable sections." },
          { title: "Growth content", description: "Landing pages, articles, and campaign pages." },
        ]),
        ctaBlock("Ready to improve the site?", "Turn this starter into a client-ready website.", "Start a project"),
      ],
    });
    const services = ensurePage(graph, {
      title: "Services",
      slug: "services",
      order: 1,
      description: "Explore available services and packages.",
      blocks: [textBlock("Services", "Describe the core services, packages, deliverables, and who each offer is for.")],
    });
    const work = ensurePage(graph, {
      title: "Work",
      slug: "work",
      order: 2,
      description: "Selected work and client outcomes.",
      blocks: [textBlock("Selected work", "Add case studies, project summaries, testimonials, or a gallery of recent work.")],
    });
    const contact = ensurePage(graph, {
      title: "Contact",
      slug: "contact",
      order: 3,
      description: "Get in touch with the team.",
      blocks: [ctaBlock("Tell us what you are building", "Keep the form or connect this page to your preferred contact workflow.", "Contact us")],
    });
    setHeaderNavigation(graph, [home, services, work, contact]);
    graph.site.enabledFeatures = { ...graph.site.enabledFeatures, mediaLibrary: true, sharedBlocks: true };
  },
};
