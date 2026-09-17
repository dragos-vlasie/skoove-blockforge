import { z } from "zod";
import { BlockType } from "../../../../../types";
import { optionalString, type BlockDefinition } from "../../../../blocks/types";

const departureSchema = z.object({ id: optionalString, date: z.string(), duration: optionalString, price: optionalString, status: optionalString, note: optionalString }).passthrough();
export const vietDepartureScheduleBlock = {
  type: BlockType.TRAVEL_DEPARTURE_SCHEDULE, label: "Departure Schedule", shortLabel: "DS", category: "Travel Agency", order: 108,
  defaultContent: { eyebrow: "Choose your date", title: "Departure schedule", introduction: "Upcoming departure dates and indicative package prices.", emptyMessage: "Departure dates are being updated.", dateLabel: "Departure date", durationLabel: "Duration", priceLabel: "Package price", statusLabel: "Availability", noteLabel: "Notes", departures: [{ id: "departure-1", date: "2026-09-12", duration: "7 days / 6 nights", price: "From 1,499", status: "Available", note: "Places available" }] },
  schema: z.object({ eyebrow: optionalString, title: optionalString, introduction: optionalString, emptyMessage: optionalString, dateLabel: optionalString, durationLabel: optionalString, priceLabel: optionalString, statusLabel: optionalString, noteLabel: optionalString, departures: z.array(departureSchema).optional() }).passthrough(),
  fields: [
    { id: "eyebrow", label: "Eyebrow", type: "text" }, { id: "title", label: "Title", type: "text" }, { id: "introduction", label: "Introduction", type: "textarea", rows: 3 }, { id: "emptyMessage", label: "Empty Message", type: "textarea", rows: 2 }, { id: "dateLabel", label: "Date Column Label", type: "text" }, { id: "durationLabel", label: "Duration Column Label", type: "text" }, { id: "priceLabel", label: "Price Column Label", type: "text" }, { id: "statusLabel", label: "Status Column Label", type: "text" }, { id: "noteLabel", label: "Note Column Label", type: "text" },
    { id: "departures", label: "Departures", type: "repeater", addLabel: "Add Departure", defaultItem: { id: "", date: "2026-09-12", duration: "7 days / 6 nights", price: "Contact us", status: "Available", note: "" }, fields: [{ id: "id", label: "Record ID", type: "text" }, { id: "date", label: "Date or Date Range", type: "text" }, { id: "duration", label: "Duration", type: "text" }, { id: "price", label: "Price", type: "text" }, { id: "status", label: "Status", type: "text" }, { id: "note", label: "Note", type: "text" }] },
  ],
} satisfies BlockDefinition;
export default vietDepartureScheduleBlock;
