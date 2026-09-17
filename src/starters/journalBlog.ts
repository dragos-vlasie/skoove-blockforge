import { createId } from "../cms/contentUtils";
import { blogGridBlock, contactFormBlock, ctaBlock, featureBentoBlock, heroBlock, imageTextBlock } from "../blocks/presets";
import { ensureBlogModel, ensureCollectionPreset, ensurePage, setBaseBrand, setFooterItems, setHeaderItems } from "./helpers";
import type { StarterDefinition } from "./types";

export const journalBlogStarter: StarterDefinition = {
  id: "journal-blog",
  label: "Journal Blog",
  description: "Editorial starter with article collections, author profiles, curated grids, and newsletter CTA.",
  bestFor: "Blogs, newsletters, journals, guides, and expert-led content sites.",
  pages: ["Home", "About", "Contact"],
  advanced: true,
  apply(graph) {
    setBaseBrand(graph, {
      name: "Field Journal",
      description: "A calm editorial website for essays, guides, and useful updates.",
      themeId: "journal-classic",
      primaryColor: "#0f766e",
      accentColor: "#7c3aed",
    });
    const blogCollection = ensureBlogModel(graph);
    if (blogCollection) {
      blogCollection.name = "Journal";
      blogCollection.slug = "journal";
      blogCollection.publicIndex = true;
      blogCollection.indexTemplateId = "blog-index";
      blogCollection.entryTemplateId = "article-standard";
      blogCollection.seo.title = "Journal";
      blogCollection.seo.description = "Essays, guides, interviews, and practical notes.";
    }
    const people = ensureCollectionPreset(graph, "collection-people");
    if (people) {
      people.name = "Authors";
      people.slug = "authors";
      people.publicIndex = true;
      people.indexTemplateId = "blog-index";
      people.entryTemplateId = "author-profile";
      people.seo.title = "Authors";
      people.seo.description = "Writers, editors, and contributors.";
    }
    const home = ensurePage(graph, {
      id: "page-home",
      title: "Home",
      slug: "/",
      order: 0,
      description: "A calm editorial website for essays, guides, and useful updates.",
      blocks: [
        heroBlock(
          "Thoughtful publishing for useful ideas",
          "Build an editorial site with article templates, author profiles, curated grids, and clear navigation.",
          "Read the journal",
          "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80",
        ),
        blogGridBlock("Featured articles"),
        featureBentoBlock("Designed for editorial clarity", "Keep writing, navigation, and SEO structured without making every page custom.", [
          { title: "Article templates", description: "Reusable layouts for posts, guides, reviews, and interviews." },
          { title: "Author profiles", description: "Optional people collections for expert-led publishing." },
          { title: "Curated grids", description: "Use Blog Grid blocks to feature hand-picked stories anywhere." },
          { title: "Topic pages", description: "Add categories only when archives or SEO pages are useful." },
        ], "Publishing system"),
        ctaBlock("Build a useful publishing home", "Start from a complete editorial foundation, then tune the voice and content.", "Start writing"),
      ],
    });
    const about = ensurePage(graph, {
      title: "About",
      slug: "about",
      order: 1,
      description: "About the publication.",
      blocks: [
        imageTextBlock(
          "A publication with a clear point of view",
          "Explain the mission, audience, editorial standards, and why readers should trust the site.",
          "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80",
          "About the journal",
        ),
      ],
    });
    const contact = ensurePage(graph, {
      title: "Contact",
      slug: "contact",
      order: 2,
      description: "Contact the publication.",
      blocks: [contactFormBlock("Send a note to the editors")],
    });
    setHeaderItems(graph, [
      { id: createId("nav-item"), label: "Home", targetType: "page", targetId: home.id },
      {
        id: createId("nav-item"),
        label: "Journal",
        targetType: blogCollection ? "collection" : "url",
        targetId: blogCollection?.id,
        href: blogCollection ? undefined : "/journal/",
      },
      {
        id: createId("nav-item"),
        label: "Authors",
        targetType: people ? "collection" : "url",
        targetId: people?.id,
        href: people ? undefined : "/authors/",
      },
      { id: createId("nav-item"), label: "About", targetType: "page", targetId: about.id },
      { id: createId("nav-item"), label: "Contact", targetType: "page", targetId: contact.id },
    ]);
    setFooterItems(graph, [
      {
        id: createId("nav-item"),
        label: "Journal",
        targetType: blogCollection ? "collection" : "url",
        targetId: blogCollection?.id,
        href: blogCollection ? undefined : "/journal/",
      },
      { id: createId("nav-item"), label: "About", targetType: "page", targetId: about.id },
      { id: createId("nav-item"), label: "Contact", targetType: "page", targetId: contact.id },
    ]);
    graph.site.enabledFeatures = { ...graph.site.enabledFeatures, contentModels: true, mediaLibrary: true, sharedBlocks: true };
  },
};
