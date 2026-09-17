import { z } from "zod";
import { BlockType } from "../../../types";
import { optionalString, type BlockDefinition } from "../types";

export const contactFormBlock = {
  type: BlockType.CONTACT_FORM,
  label: "Contact Form",
  shortLabel: "CF",
  category: "Marketing",
  order: 72,
  defaultContent: {
    presentation: "theme",
    eyebrow: "Contact",
    title: "Start a conversation",
    subtitle: "Tell us what you need and we will help you choose the right next step.",
    email: "hello@example.com",
    buttonText: "Send message",
  },
  schema: z
    .object({
      presentation: z.enum(["theme", "split", "centered", "compact"]).default("theme"),
      eyebrow: optionalString,
      title: z.string(),
      subtitle: optionalString,
      email: optionalString,
      buttonText: optionalString,
    })
    .passthrough(),
  fields: [
    {
      id: "presentation",
      label: "Presentation",
      type: "select",
      options: [
        { label: "Theme default", value: "theme" },
        { label: "Split content and form", value: "split" },
        { label: "Centered", value: "centered" },
        { label: "Compact", value: "compact" },
      ],
    },
    { id: "eyebrow", label: "Eyebrow", type: "text" },
    { id: "title", label: "Title", type: "text" },
    { id: "subtitle", label: "Subtitle", type: "textarea", rows: 3 },
    { id: "email", label: "Email", type: "text" },
    { id: "buttonText", label: "Button Text", type: "text" },
  ],
  compositionRole: "section",
  presets: [
    { id: "theme-default", name: "Theme contact", description: "Contact experience recommended by the active theme.", recommended: true, content: { presentation: "theme" } },
    { id: "split", name: "Split contact", description: "Contact details beside the enquiry form.", content: { presentation: "split" } },
    { id: "centered", name: "Centered contact", description: "A focused form beneath a centred introduction.", content: { presentation: "centered" } },
    { id: "compact", name: "Compact enquiry", description: "A reduced-height contact section for landing pages.", content: { presentation: "compact" } },
  ],
} satisfies BlockDefinition;

export default contactFormBlock;
