import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

const linkSchema = z.object({ id: optionalString, label: z.string(), href: z.string(), meta: optionalString }).passthrough();
const departureSchema = z.object({ id: optionalString, date: z.string(), price: optionalString, status: optionalString, note: optionalString }).passthrough();

export const vietTourPackageBlock = {
  type: BlockType.TRAVEL_TOUR_PACKAGE,
  label: "Tour Package",
  shortLabel: "TP",
  category: "Travel Agency",
  order: 108,
  defaultContent: {
    sourceOfferId: "",
    eyebrow: "Tour option",
    title: "Tour package name",
    summary: "Explain what makes this option different.",
    duration: "5 days / 4 nights",
    transportLabel: "Flight",
    carrierName: "To be confirmed",
    shoppingLabel: "As described in the programme",
    badge: "",
    priceFromLabel: "From",
    priceFrom: "Contact us",
    durationLabel: "Duration",
    transportFactLabel: "Transport",
    carrierLabel: "Carrier",
    shoppingFactLabel: "Tour format",
    programmeLabel: "Detailed programme",
    dateLabel: "Departure date",
    priceLabel: "Price",
    statusLabel: "Availability",
    noteLabel: "Notes",
    emptyMessage: "Departure dates are being updated.",
    programmeLinks: [],
    departures: [],
  },
  schema: z.object({
    sourceOfferId: optionalString, eyebrow: optionalString, title: z.string(), summary: optionalString,
    duration: optionalString, transportLabel: optionalString, carrierName: optionalString,
    shoppingLabel: optionalString, badge: optionalString, priceFromLabel: optionalString, priceFrom: optionalString,
    durationLabel: optionalString, transportFactLabel: optionalString, carrierLabel: optionalString,
    shoppingFactLabel: optionalString, programmeLabel: optionalString, dateLabel: optionalString,
    priceLabel: optionalString, statusLabel: optionalString, noteLabel: optionalString, emptyMessage: optionalString,
    programmeLinks: z.array(linkSchema).optional(), departures: z.array(departureSchema).optional(),
  }).passthrough(),
  fields: [
    { id: "sourceOfferId", label: "Source Offer ID", type: "text" },
    { id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Package Title", type: "text" },
    { id: "summary", label: "Summary", type: "textarea", rows: 4 }, { id: "duration", label: "Duration", type: "text" },
    { id: "transportLabel", label: "Transport", type: "text" }, { id: "carrierName", label: "Carrier", type: "text" },
    { id: "shoppingLabel", label: "Shopping Policy", type: "text" }, { id: "badge", label: "Badge", type: "text" },
    { id: "priceFromLabel", label: "Price From Label", type: "text" }, { id: "priceFrom", label: "Price From", type: "text" },
    { id: "durationLabel", label: "Duration Label", type: "text" }, { id: "transportFactLabel", label: "Transport Label", type: "text" },
    { id: "carrierLabel", label: "Carrier Label", type: "text" }, { id: "shoppingFactLabel", label: "Shopping Label", type: "text" },
    { id: "programmeLabel", label: "Programme Label", type: "text" }, { id: "dateLabel", label: "Date Column Label", type: "text" },
    { id: "priceLabel", label: "Price Column Label", type: "text" }, { id: "statusLabel", label: "Status Column Label", type: "text" },
    { id: "noteLabel", label: "Note Column Label", type: "text" }, { id: "emptyMessage", label: "Empty Message", type: "textarea", rows: 2 },
    { id: "programmeLinks", label: "Programme Links", type: "repeater", addLabel: "Add Programme Link", defaultItem: { id: "", label: "Programme", href: "", meta: "" }, fields: [{ id: "id", label: "ID", type: "text" }, { id: "label", label: "Label", type: "text" }, { id: "href", label: "Link", type: "url" }, { id: "meta", label: "Meta", type: "text" }] },
    { id: "departures", label: "Departures and Prices", type: "repeater", addLabel: "Add Departure", defaultItem: { id: "", date: "", price: "Contact us", status: "Available", note: "" }, fields: [{ id: "id", label: "ID", type: "text" }, { id: "date", label: "Date or Date Range", type: "text" }, { id: "price", label: "Price", type: "text" }, { id: "status", label: "Status", type: "text" }, { id: "note", label: "Note", type: "text" }] },
  ],
} satisfies BlockDefinition;

export default vietTourPackageBlock;
