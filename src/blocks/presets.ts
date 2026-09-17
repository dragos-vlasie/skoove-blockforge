import { BlockType, type BlockData } from "../../types";
import { createId } from "../cms/contentUtils";

export const richTextDoc = (text: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text }],
    },
  ],
});

export const createBlock = (type: BlockType, content: Record<string, any>): BlockData => ({
  id: createId("block"),
  type,
  content,
});

export const heroBlock = (title: string, subtitle: string, buttonText: string, bgImage: string) =>
  createBlock(BlockType.HERO, {
    title,
    subtitle,
    buttonText,
    href: "/contact/",
    bgImage,
    imageAlt: title,
  });

export const textBlock = (title: string, body: string) =>
  createBlock(BlockType.TEXT, {
    title,
    nodes: richTextDoc(body),
  });

export const featuresBlock = (title: string, items: Array<{ title: string; description: string }>) =>
  createBlock(BlockType.FEATURES, { title, items });

export const ctaBlock = (title: string, subtitle: string, buttonText = "Get started") =>
  createBlock(BlockType.CTA, {
    title,
    subtitle,
    buttonText,
    href: "/contact/",
  });

export const logoCloudBlock = (eyebrow: string, logos: string[]) =>
  createBlock(BlockType.LOGO_CLOUD, {
    eyebrow,
    logos: logos.map((name) => ({ name })),
  });

export const featureBentoBlock = (
  title: string,
  subtitle: string,
  items: Array<{ title: string; description: string }>,
  eyebrow = "One flexible platform",
) =>
  createBlock(BlockType.FEATURE_BENTO, {
    eyebrow,
    title,
    subtitle,
    items,
  });

export const imageTextBlock = (title: string, body: string, image: string, eyebrow = "Built to adapt") =>
  createBlock(BlockType.IMAGE_TEXT, {
    eyebrow,
    title,
    body,
    image,
    imageAlt: title,
    buttonText: "Learn more",
    href: "/about/",
  });

export const statsBlock = (items: Array<{ value: string; label: string }>) => createBlock(BlockType.STATS, { items });

export const testimonialsBlock = (title: string, items: Array<{ quote: string; name: string; role: string }>) =>
  createBlock(BlockType.TESTIMONIALS, {
    eyebrow: "Customer proof",
    title,
    items,
  });

export const pricingBlock = (plans: Array<{ name: string; price: string; description: string; features: string; buttonText: string }>) =>
  createBlock(BlockType.PRICING, {
    eyebrow: "Simple pricing",
    title: "Choose the right plan",
    subtitle: "Editable pricing cards for packages, services, retainers, or product tiers.",
    plans,
  });

export const blogGridBlock = (title = "Latest writing") =>
  createBlock(BlockType.BLOG_GRID, {
    eyebrow: "Journal",
    title,
    subtitle: "Curated articles and updates. Connect this to collection-driven listings as the site grows.",
    posts: [
      { title: "How we think about useful websites", excerpt: "A short guide to structure, clarity, and conversion.", href: "/blog/" },
      { title: "Building reusable content systems", excerpt: "Why blocks, templates, and starters should stay separate.", href: "/blog/" },
      { title: "A better publishing workflow", excerpt: "Draft safely, validate content, and publish static pages.", href: "/blog/" },
    ],
  });

export const contactFormBlock = (title = "Start a conversation") =>
  createBlock(BlockType.CONTACT_FORM, {
    eyebrow: "Contact",
    title,
    subtitle: "Share a few details and we will get back to you.",
    email: "hello@example.com",
    buttonText: "Send message",
  });

export const faqBlock = (headline: string, items: Array<{ question: string; answer: string }>) =>
  createBlock(BlockType.FAQ, {
    tagLine: "FAQ",
    headline,
    items,
  });
