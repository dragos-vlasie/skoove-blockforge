import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

const optionSchema = z.object({ value: z.string(), label: z.string() }).passthrough();
export const vietTourEnquiryBlock = {
  type: BlockType.TRAVEL_TOUR_ENQUIRY, label: "Tour Enquiry", shortLabel: "TE", category: "Travel Agency", order: 111,
  defaultContent: { sectionId: "travel-enquiry", collectionId: "collection-tours", eyebrow: "Plan your journey", title: "Request a travel consultation", body: "Leave your details and our travel team will contact you about dates, costs, and the right itinerary.", submitLabel: "Send enquiry", action: "/thank-you/", formName: "travel-agency-enquiry", phoneLabel: "Or call us directly", phoneHref: "tel:+10000000000", privacyLabel: "Your details will only be used to respond to this travel enquiry.", nameLabel: "Full name", phoneFieldLabel: "Phone number", tourLabel: "Tour of interest", tourPlaceholder: "Choose a journey", monthLabel: "Preferred month", guestsLabel: "Number of travellers", notesLabel: "Notes", tourOptions: [{ value: "", label: "Not sure yet" }] },
  schema: z.object({ sectionId: optionalString, collectionId: optionalString, eyebrow: optionalString, title: z.string(), body: optionalString, submitLabel: optionalString, action: optionalString, formName: optionalString, phoneLabel: optionalString, phoneHref: optionalString, privacyLabel: optionalString, nameLabel: optionalString, phoneFieldLabel: optionalString, tourLabel: optionalString, tourPlaceholder: optionalString, monthLabel: optionalString, guestsLabel: optionalString, notesLabel: optionalString, tourOptions: z.array(optionSchema).optional() }).passthrough(),
  fields: [
    { id: "sectionId", label: "Section Anchor ID", type: "text" }, { id: "collectionId", label: "Tour Collection ID", type: "text" }, { id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "body", label: "Body", type: "textarea", rows: 4 }, { id: "submitLabel", label: "Submit Label", type: "text" }, { id: "action", label: "Form Action", type: "url" }, { id: "formName", label: "Form Name", type: "text" }, { id: "phoneLabel", label: "Phone Label", type: "text" }, { id: "phoneHref", label: "Phone Link", type: "url" }, { id: "privacyLabel", label: "Privacy Label", type: "textarea", rows: 2 },
    { id: "nameLabel", label: "Name Field Label", type: "text" }, { id: "phoneFieldLabel", label: "Phone Field Label", type: "text" }, { id: "tourLabel", label: "Tour Field Label", type: "text" }, { id: "tourPlaceholder", label: "Tour Placeholder", type: "text" }, { id: "monthLabel", label: "Month Field Label", type: "text" }, { id: "guestsLabel", label: "Guests Field Label", type: "text" }, { id: "notesLabel", label: "Notes Field Label", type: "text" },
    { id: "tourOptions", label: "Tour Options", type: "repeater", addLabel: "Add Tour Option", defaultItem: { value: "tour-id", label: "Tour name" }, fields: [{ id: "value", label: "Value", type: "text" }, { id: "label", label: "Label", type: "text" }] },
  ],
} satisfies BlockDefinition;
export default vietTourEnquiryBlock;
