import { createId } from "../cms/contentUtils";
import { ctaBlock, featuresBlock, heroBlock, textBlock } from "../blocks/presets";
import { ensureBlogModel, ensurePage, setBaseBrand, setHeaderItems } from "./helpers";
import type { StarterDefinition } from "./types";

export const blogStarter: StarterDefinition = {
  id: "blog",
  label: "Blog",
  description: "Home, blog index, about, and contact with articles enabled.",
  bestFor: "Blogs, magazines, guides, newsletters, and content-led sites.",
  pages: ["Home", "Blog", "About", "Contact"],
  advanced: true,
  apply(graph) {
    setBaseBrand(graph, {
      name: "Editorial Site",
      description: "Articles, guides, and resources published from a structured CMS.",
      themeId: "journal-classic",
      primaryColor: "#0f766e",
      accentColor: "#7c3aed",
    });
    const blogCollection = ensureBlogModel(graph);
    if (blogCollection) {
      blogCollection.name = "Blog";
      blogCollection.slug = "blog";
      blogCollection.publicIndex = true;
      blogCollection.indexTemplateId = "blog-index";
      blogCollection.entryTemplateId = "article-standard";
      blogCollection.seo.title = "Blog";
      blogCollection.seo.description = "Browse articles, guides, resources, and editorial updates.";
    }
    const home = ensurePage(graph, {
      id: "page-home",
      title: "Home",
      slug: "/",
      order: 0,
      description: "Articles, guides, and resources published from a structured CMS.",
      blocks: [
        heroBlock(
          "Publish a sharper blog",
          "Create articles, organize topics, and keep every page fast, validated, and searchable.",
          "Read the latest",
          "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80",
        ),
        featuresBlock("Built for publishing", [
          { title: "Article templates", description: "Every post gets a clean editorial layout." },
          { title: "Topic pages", description: "Categories can become public index pages when needed." },
          { title: "SEO defaults", description: "Metadata, schema, and sitemap output stay consistent." },
        ]),
      ],
    });
    const about = ensurePage(graph, {
      title: "About",
      slug: "about",
      order: 2,
      description: "Learn more about this publication.",
      blocks: [textBlock("About this site", "Explain the mission, audience, and point of view behind the publication.")],
    });
    const contact = ensurePage(graph, {
      title: "Contact",
      slug: "contact",
      order: 3,
      description: "Contact the editorial team.",
      blocks: [ctaBlock("Have a story or question?", "Invite readers, partners, or customers to get in touch.", "Contact us")],
    });
    setHeaderItems(graph, [
      { id: createId("nav-item"), label: "Home", targetType: "page", targetId: home.id },
      {
        id: createId("nav-item"),
        label: "Blog",
        targetType: blogCollection ? "collection" : "url",
        targetId: blogCollection?.id,
        href: blogCollection ? undefined : "/blog/",
      },
      { id: createId("nav-item"), label: "About", targetType: "page", targetId: about.id },
      { id: createId("nav-item"), label: "Contact", targetType: "page", targetId: contact.id },
    ]);
    graph.site.enabledFeatures = { ...graph.site.enabledFeatures, contentModels: true, mediaLibrary: true, sharedBlocks: true };
  },
};
