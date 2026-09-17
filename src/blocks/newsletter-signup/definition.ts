import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const newsletterSignupBlock = {
  type: BlockType.NEWSLETTER_SIGNUP,
  label: "Newsletter Signup",
  shortLabel: "NS",
  category: "Marketing",
  order: 74,
  defaultContent: {
    presentation: "theme",
    eyebrow: "Stay informed",
    title: "Get the next story in your inbox",
    subtitle: "Occasional updates with useful ideas. No noise.",
    action: "",
    emailFieldName: "EMAIL",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    buttonText: "Subscribe",
    privacyText: "You can unsubscribe at any time.",
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "inline", "panel", "minimal"]).default("theme"),
      eyebrow: optionalString,
      title: z.string(),
      subtitle: optionalString,
      action: optionalString,
      emailFieldName: optionalString,
      emailLabel: optionalString,
      emailPlaceholder: optionalString,
      buttonText: optionalString,
      privacyText: optionalString,
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Inline", value: "inline" },
        { label: "Panel", value: "panel" },
        { label: "Minimal", value: "minimal" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "subtitle", label: "Description", type: "textarea", rows: 3 },
    { id: "action", label: "Signup Form URL", type: "url", placeholder: "Mailchimp, Buttondown, ConvertKit, or another HTTPS endpoint" },
    { id: "emailFieldName", label: "Email Field Name", type: "text" },
    { id: "emailLabel", label: "Email Label", type: "text" },
    { id: "emailPlaceholder", label: "Email Placeholder", type: "text" },
    { id: "buttonText", label: "Button Text", type: "text" },
    { id: "privacyText", label: "Privacy Note", type: "textarea", rows: 2 },
  ],
  compositionRole: "both",
  presets: [
    { id: "theme-default", name: "Theme signup", description: "Newsletter treatment recommended by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "inline", name: "Inline signup", description: "Compact email field and button for article content.", content: { presentation: "inline" } },
    { id: "panel", name: "Signup panel", description: "A stronger standalone subscription section.", content: { presentation: "panel" } },
    { id: "minimal", name: "Minimal signup", description: "Quiet form treatment inside long-form content.", content: { presentation: "minimal" } },
  ],
} satisfies BlockDefinition;

export default newsletterSignupBlock;
