import { createId } from "../cms/contentUtils";
import {
  blogGridBlock,
  contactFormBlock,
  ctaBlock,
  faqBlock,
  featureBentoBlock,
  heroBlock,
  imageTextBlock,
  logoCloudBlock,
  pricingBlock,
  statsBlock,
  testimonialsBlock,
} from "../blocks/presets";
import { ensureBlogModel, ensurePage, setBaseBrand, setFooterItems, setHeaderItems } from "./helpers";
import type { StarterDefinition } from "./types";

export const launchSaasStarter: StarterDefinition = {
  id: "launch-saas",
  label: "Launch SaaS",
  description: "Polished SaaS starter with product sections, proof, pricing, FAQ, and conversion pages.",
  bestFor: "SaaS, productized services, startup landing pages, and platform websites.",
  pages: ["Home", "Product", "Pricing", "Resources", "Contact"],
  apply(graph) {
    setBaseBrand(graph, {
      name: "Brightflow",
      description: "Launch, explain, and grow a modern software product from reusable CMS sections.",
      themeId: "launch-saas",
      primaryColor: "#6d5dfc",
      accentColor: "#2563eb",
    });
    const blogCollection = ensureBlogModel(graph);
    if (blogCollection) {
      blogCollection.name = "Resources";
      blogCollection.slug = "resources";
      blogCollection.publicIndex = true;
      blogCollection.indexTemplateId = "blog-index";
      blogCollection.entryTemplateId = "article-standard";
      blogCollection.seo.title = "Resources";
      blogCollection.seo.description = "Product guides, release notes, and practical articles.";
    }
    const home = ensurePage(graph, {
      id: "page-home",
      title: "Home",
      slug: "/",
      order: 0,
      description: "Launch, explain, and grow a modern software product from reusable CMS sections.",
      blocks: [
        heroBlock(
          "Create, launch, and grow from one place.",
          "A flexible platform for publishing beautiful websites and running the workflows behind your business.",
          "Start building",
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80",
        ),
        logoCloudBlock("Teams building with Brightflow", ["Northstar", "Outline", "Vertex", "Gather", "Monogram"]),
        featureBentoBlock("Everything your team needs to move faster", "Reusable sections, structured content, and static publishing in one clean workflow.", [
          { title: "Visual page builder", description: "Create pages from safe reusable CMS blocks." },
          { title: "Content models", description: "Add articles, resources, or docs only when the site needs them." },
          { title: "Fast public output", description: "Publish fast Next.js pages without shipping the CMS editor to visitors." },
          { title: "Client-ready setup", description: "Seed brand, navigation, SEO, and starter content quickly." },
        ]),
        imageTextBlock(
          "A clean system for product stories",
          "Show the product, explain the workflow, and keep every section editable from the CMS.",
          "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80",
          "Product story",
        ),
        statsBlock([
          { value: "5", label: "Starter pages" },
          { value: "12+", label: "Reusable sections" },
          { value: "0", label: "CMS runtime on public pages" },
        ]),
        testimonialsBlock("Built for teams that ship", [
          { quote: "The structure made the whole site faster to edit and easier to explain.", name: "Ari Kim", role: "Product lead" },
          { quote: "We reused the same polished blocks across launch pages without losing control.", name: "Mina Cole", role: "Founder" },
          { quote: "The content stayed clean while the public site stayed fast.", name: "Jon Bell", role: "Engineer" },
        ]),
        pricingBlock([
          { name: "Starter", price: "$19", description: "For a focused launch site.", features: "Core pages, Reusable blocks, SEO basics", buttonText: "Start free" },
          { name: "Growth", price: "$49", description: "For teams publishing regularly.", features: "Collections, Media library, Shared blocks", buttonText: "Choose Growth" },
          { name: "Scale", price: "Custom", description: "For multi-site client workflows.", features: "Custom starters, App packs, Priority support", buttonText: "Talk to us" },
        ]),
        faqBlock("Questions before launch", [
          { question: "Can we edit every section?", answer: "Yes. Each section is a reusable CMS block with generated fields." },
          { question: "Does the public site need CMS JavaScript?", answer: "No. Public marketing blocks render statically unless a block truly needs interactivity." },
          { question: "Can we add a blog later?", answer: "Yes. The starter can seed article collections and templates when needed." },
        ]),
        ctaBlock("Ready to launch the next page?", "Start from the starter, then adjust blocks, brand, navigation, and SEO.", "Start building"),
      ],
    });
    const product = ensurePage(graph, {
      title: "Product",
      slug: "product",
      order: 1,
      description: "Explore the product workflow and core features.",
      blocks: [
        featureBentoBlock("A product story built from blocks", "Use reusable sections to explain the product clearly.", [
          { title: "Build pages", description: "Compose pages from safe, editable blocks." },
          { title: "Reuse content", description: "Promote shared blocks when the same message appears everywhere." },
          { title: "Publish cleanly", description: "Generate static pages from validated content." },
          { title: "Grow later", description: "Add app modules and collections when the business needs them." },
        ]),
        imageTextBlock(
          "Keep the marketing layer clean",
          "The base CMS stays focused on pages, media, SEO, templates, and navigation.",
          "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80",
        ),
      ],
    });
    const pricingPage = ensurePage(graph, {
      title: "Pricing",
      slug: "pricing",
      order: 2,
      description: "Simple pricing and package options.",
      blocks: [
        pricingBlock([
          { name: "Starter", price: "$19", description: "For a focused launch site.", features: "Core pages, Reusable blocks, SEO basics", buttonText: "Start free" },
          { name: "Growth", price: "$49", description: "For regular publishing.", features: "Collections, Media library, Shared blocks", buttonText: "Choose Growth" },
          { name: "Scale", price: "Custom", description: "For larger client workflows.", features: "Custom starters, App packs, Support", buttonText: "Talk to us" },
        ]),
        faqBlock("Pricing questions", [
          { question: "Can plans be changed?", answer: "Yes. Pricing cards are normal editable CMS fields." },
          { question: "Can this connect to checkout?", answer: "Yes, but checkout should be an app module, not part of the base marketing block." },
        ]),
      ],
    });
    const contact = ensurePage(graph, {
      title: "Contact",
      slug: "contact",
      order: 4,
      description: "Contact the team.",
      blocks: [contactFormBlock("Tell us about your launch")],
    });
    setHeaderItems(graph, [
      { id: createId("nav-item"), label: "Home", targetType: "page", targetId: home.id },
      { id: createId("nav-item"), label: "Product", targetType: "page", targetId: product.id },
      { id: createId("nav-item"), label: "Pricing", targetType: "page", targetId: pricingPage.id },
      {
        id: createId("nav-item"),
        label: "Resources",
        targetType: blogCollection ? "collection" : "url",
        targetId: blogCollection?.id,
        href: blogCollection ? undefined : "/resources/",
      },
      { id: createId("nav-item"), label: "Contact", targetType: "page", targetId: contact.id },
    ]);
    setFooterItems(graph, [
      { id: createId("nav-item"), label: "Product", targetType: "page", targetId: product.id },
      { id: createId("nav-item"), label: "Pricing", targetType: "page", targetId: pricingPage.id },
      { id: createId("nav-item"), label: "Contact", targetType: "page", targetId: contact.id },
    ]);
    graph.site.enabledFeatures = { ...graph.site.enabledFeatures, contentModels: true, mediaLibrary: true, sharedBlocks: true };
  },
};
