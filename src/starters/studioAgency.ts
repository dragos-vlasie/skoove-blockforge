import { createId } from "../cms/contentUtils";
import {
  contactFormBlock,
  ctaBlock,
  featureBentoBlock,
  featuresBlock,
  heroBlock,
  imageTextBlock,
  logoCloudBlock,
  pricingBlock,
  statsBlock,
  testimonialsBlock,
} from "../blocks/presets";
import { ensureCollectionPreset, ensurePage, setBaseBrand, setFooterItems, setHeaderItems } from "./helpers";
import type { StarterDefinition } from "./types";

export const studioAgencyStarter: StarterDefinition = {
  id: "studio-agency",
  label: "Studio Agency",
  description: "Modern agency starter with services, proof, case studies, pricing, and contact.",
  bestFor: "Design studios, consultants, creative agencies, and service businesses.",
  pages: ["Home", "Services", "Work", "About", "Contact"],
  advanced: true,
  apply(graph) {
    setBaseBrand(graph, {
      name: "Northstar Studio",
      description: "Strategy, design, and websites for teams that need clearer digital presence.",
      themeId: "studio-agency",
      primaryColor: "#0f172a",
      accentColor: "#14b8a6",
    });
    const caseStudies = ensureCollectionPreset(graph, "collection-case-studies");
    if (caseStudies) {
      caseStudies.name = "Work";
      caseStudies.slug = "work";
      caseStudies.publicIndex = true;
      caseStudies.indexTemplateId = "blog-index";
      caseStudies.entryTemplateId = "article-standard";
      caseStudies.seo.title = "Work";
      caseStudies.seo.description = "Selected projects, case studies, and client outcomes.";
    }
    const home = ensurePage(graph, {
      id: "page-home",
      title: "Home",
      slug: "/",
      order: 0,
      description: "Strategy, design, and websites for teams that need clearer digital presence.",
      blocks: [
        heroBlock(
          "Strategy, design, and websites that convert",
          "A studio-ready starter with services, proof, process, and conversion sections you can edit fast.",
          "Book a call",
          "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80",
        ),
        logoCloudBlock("Trusted by teams with momentum", ["Atlas", "Coda", "Signal", "Drift", "Noble"]),
        featureBentoBlock("What the studio can package", "Clear offers make agency websites easier to sell and easier to edit.", [
          { title: "Brand systems", description: "Positioning, messaging, identity, and art direction." },
          { title: "Website design", description: "Reusable page sections, templates, and conversion flows." },
          { title: "Content strategy", description: "Editorial structure, page hierarchy, and SEO foundations." },
          { title: "Launch support", description: "Publishing setup, media, navigation, and handoff." },
        ], "Services"),
        imageTextBlock(
          "Show process without overwhelming visitors",
          "Use Image/Text, Bento, Testimonials, and Case Study templates to make proof clear.",
          "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&q=80",
          "Process",
        ),
        testimonialsBlock("Clients remember clarity", [
          { quote: "The new structure made the offer much easier to understand.", name: "Elena Marks", role: "Founder" },
          { quote: "We could update pages without touching layout code.", name: "Nate Rowe", role: "Marketing lead" },
          { quote: "The site finally matched the quality of the work.", name: "Rina Shah", role: "Creative director" },
        ]),
        ctaBlock("Have a project in mind?", "Use this starter as the first client-ready agency website base.", "Start a project"),
      ],
    });
    const services = ensurePage(graph, {
      title: "Services",
      slug: "services",
      order: 1,
      description: "Service packages and capabilities.",
      blocks: [
        featuresBlock("Services", [
          { title: "Brand strategy", description: "Clarify the offer, audience, voice, and point of view." },
          { title: "Website systems", description: "Reusable sections, templates, navigation, and CMS setup." },
          { title: "Launch content", description: "Pages, articles, case studies, and conversion copy." },
        ]),
        pricingBlock([
          { name: "Sprint", price: "$2,500", description: "A focused package for one campaign or page.", features: "Discovery, One page, Launch support", buttonText: "Book sprint" },
          { name: "Website", price: "$7,500", description: "A complete small business or studio website.", features: "5 pages, CMS setup, Training", buttonText: "Start website" },
          { name: "Partner", price: "Custom", description: "Ongoing design and publishing support.", features: "Retainer, Content, Iteration", buttonText: "Talk to us" },
        ]),
      ],
    });
    const about = ensurePage(graph, {
      title: "About",
      slug: "about",
      order: 3,
      description: "About the studio.",
      blocks: [
        imageTextBlock(
          "Small team, senior focus",
          "Use this page for positioning, values, team story, and the kind of clients the studio serves.",
          "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80",
          "About",
        ),
        statsBlock([
          { value: "12", label: "Years experience" },
          { value: "80+", label: "Projects launched" },
          { value: "4", label: "Core services" },
        ]),
      ],
    });
    const contact = ensurePage(graph, {
      title: "Contact",
      slug: "contact",
      order: 4,
      description: "Contact the studio.",
      blocks: [contactFormBlock("Tell us what you want to improve")],
    });
    setHeaderItems(graph, [
      { id: createId("nav-item"), label: "Home", targetType: "page", targetId: home.id },
      { id: createId("nav-item"), label: "Services", targetType: "page", targetId: services.id },
      {
        id: createId("nav-item"),
        label: "Work",
        targetType: caseStudies ? "collection" : "url",
        targetId: caseStudies?.id,
        href: caseStudies ? undefined : "/work/",
      },
      { id: createId("nav-item"), label: "About", targetType: "page", targetId: about.id },
      { id: createId("nav-item"), label: "Contact", targetType: "page", targetId: contact.id },
    ]);
    setFooterItems(graph, [
      { id: createId("nav-item"), label: "Services", targetType: "page", targetId: services.id },
      { id: createId("nav-item"), label: "About", targetType: "page", targetId: about.id },
      { id: createId("nav-item"), label: "Contact", targetType: "page", targetId: contact.id },
    ]);
    graph.site.enabledFeatures = { ...graph.site.enabledFeatures, contentModels: true, mediaLibrary: true, sharedBlocks: true };
  },
};
