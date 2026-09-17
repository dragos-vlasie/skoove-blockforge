import { z } from "zod";
import { BlockType } from "../../../types";
import { type BlockDefinition } from "../types";

const nestedBlockSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    content: z.record(z.string(), z.unknown()).default({}),
  })
  .passthrough();

export const twoColumnBlock = {
  type: BlockType.TWO_COLUMN,
  label: "Mixed Content",
  shortLabel: "Grid",
  category: "Layout",
  order: 44,
  defaultContent: {
    layout: "split",
    gap: "lg",
    padding: "lg",
    columns: [
      {
        id: "primary",
        label: "Primary",
        blocks: [
          {
            id: "composition-primary-text",
            type: BlockType.TEXT,
            content: {
              title: "A flexible composition",
              nodes: {
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 2 },
                    content: [{ type: "text", text: "Mix the content this story needs" }],
                  },
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Combine text, media, proof, and actions while the active theme keeps everything visually coherent." }],
                  },
                ],
              },
            },
          },
        ],
      },
      {
        id: "supporting",
        label: "Supporting",
        blocks: [
          {
            id: "composition-supporting-media",
            type: BlockType.MEDIA,
            content: {
              image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80",
              imageAlt: "",
              caption: "",
              aspectRatio: "landscape",
              treatment: "theme",
            },
          },
        ],
      },
    ],
  },
  schema: z
    .object({
      layout: z
        .enum(["split", "sidebar-left", "sidebar-right", "three-equal", "feature-left", "feature-right", "50-50", "60-40", "40-60"])
        .default("split"),
      gap: z.enum(["sm", "md", "lg"]).default("lg"),
      padding: z.enum(["md", "lg", "xl"]).default("lg"),
      columns: z
        .array(
          z
            .object({
              id: z.string(),
              label: z.string().optional(),
              blocks: z.array(nestedBlockSchema).default([]),
            })
            .passthrough(),
        )
        .min(1)
        .max(4),
    })
    .passthrough(),
  fields: [
    {
      id: "layout",
      label: "Composition",
      type: "select",
      options: [
        { label: "Equal split", value: "split" },
        { label: "Wide right", value: "sidebar-left" },
        { label: "Wide left", value: "sidebar-right" },
        { label: "Three equal", value: "three-equal" },
        { label: "Feature left", value: "feature-left" },
        { label: "Feature right", value: "feature-right" },
      ],
    },
    {
      id: "gap",
      label: "Gap",
      type: "select",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    {
      id: "padding",
      label: "Section spacing",
      type: "select",
      options: [
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
        { label: "Extra large", value: "xl" },
      ],
    },
  ],
  compositionRole: "section",
  presets: [
    {
      id: "story-split",
      name: "Story split",
      description: "A recommended text and image composition that follows the active theme.",
      recommended: true,
      content: { layout: "split" },
    },
    {
      id: "three-part-story",
      name: "Three-part story",
      description: "Place three different content blocks next to each other.",
      content: {
        layout: "three-equal",
        columns: [
          {
            id: "story",
            label: "Story",
            blocks: [
              {
                id: "composition-story-text",
                type: BlockType.TEXT,
                content: {
                  title: "The story",
                  nodes: {
                    type: "doc",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "Introduce the idea with clear supporting context." }] }],
                  },
                },
              },
            ],
          },
          {
            id: "visual",
            label: "Visual",
            blocks: [
              {
                id: "composition-story-media",
                type: BlockType.MEDIA,
                content: {
                  image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80",
                  imageAlt: "",
                  caption: "",
                  aspectRatio: "square",
                  treatment: "theme",
                },
              },
            ],
          },
          {
            id: "action",
            label: "Next step",
            blocks: [
              {
                id: "composition-story-cta",
                type: BlockType.CTA,
                content: {
                  presentation: "minimal",
                  eyebrow: "Next step",
                  title: "Continue the journey",
                  subtitle: "Give visitors one clear action after the story.",
                  buttonText: "Learn more",
                  href: "#content",
                },
              },
            ],
          },
        ],
      },
    },
    {
      id: "feature-and-support",
      name: "Feature and support",
      description: "Give one component more visual weight with two supporting components beside it.",
      content: {
        layout: "feature-left",
        columns: [
          {
            id: "feature",
            label: "Feature",
            blocks: [
              {
                id: "composition-feature-media",
                type: BlockType.MEDIA,
                content: {
                  image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80",
                  imageAlt: "",
                  caption: "",
                  aspectRatio: "landscape",
                  treatment: "theme",
                },
              },
            ],
          },
          {
            id: "context",
            label: "Context",
            blocks: [
              {
                id: "composition-feature-text",
                type: BlockType.TEXT,
                content: {
                  title: "Supporting context",
                  nodes: {
                    type: "doc",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "Explain why the featured content matters." }] }],
                  },
                },
              },
            ],
          },
          {
            id: "proof",
            label: "Proof",
            blocks: [
              {
                id: "composition-feature-stats",
                type: BlockType.STATS,
                content: { items: [{ label: "Customer satisfaction", value: "96%" }] },
              },
            ],
          },
        ],
      },
    },
  ],
} satisfies BlockDefinition;

export default twoColumnBlock;
