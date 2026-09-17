import { ctaBlock, featuresBlock, heroBlock, textBlock } from "../blocks/presets";
import { ensurePage, setBaseBrand, setHeaderNavigation } from "./helpers";
import type { StarterDefinition } from "./types";

export const localBusinessStarter: StarterDefinition = {
  id: "local-business",
  label: "Local Business",
  description: "Practical starter for a company that needs trust, services, location, and contact.",
  bestFor: "Clinics, trades, restaurants, venues, shops, and local services.",
  pages: ["Home", "Services", "About", "Contact"],
  apply(graph) {
    setBaseBrand(graph, {
      name: "Local Business",
      description: "A practical local business website with services, trust sections, and contact pages.",
      themeId: "local-trust",
      primaryColor: "#0f766e",
      accentColor: "#f59e0b",
    });
    const home = ensurePage(graph, {
      id: "page-home",
      title: "Home",
      slug: "/",
      order: 0,
      description: "A practical local business website with services, trust sections, and contact pages.",
      blocks: [
        heroBlock(
          "Local service, made simple",
          "Tell visitors what you do, where you work, and how to contact you.",
          "Contact us",
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80",
        ),
        featuresBlock("Why customers choose us", [
          { title: "Clear service", description: "Explain the core offer in simple language." },
          { title: "Local trust", description: "Add reviews, guarantees, certifications, or years in business." },
          { title: "Easy contact", description: "Make phone, email, booking, or visit information obvious." },
        ]),
      ],
    });
    const services = ensurePage(graph, {
      title: "Services",
      slug: "services",
      order: 1,
      description: "Services and areas covered.",
      blocks: [textBlock("Services", "List services, prices or packages, service areas, and what customers should expect.")],
    });
    const about = ensurePage(graph, {
      title: "About",
      slug: "about",
      order: 2,
      description: "About the business.",
      blocks: [textBlock("About", "Tell the business story, credentials, team, and local connection.")],
    });
    const contact = ensurePage(graph, {
      title: "Contact",
      slug: "contact",
      order: 3,
      description: "Contact and location details.",
      blocks: [ctaBlock("Ready to talk?", "Add phone, email, opening hours, map details, or booking links.", "Contact us")],
    });
    setHeaderNavigation(graph, [home, services, about, contact]);
    graph.site.enabledFeatures = { ...graph.site.enabledFeatures, mediaLibrary: true, sharedBlocks: true };
  },
};
