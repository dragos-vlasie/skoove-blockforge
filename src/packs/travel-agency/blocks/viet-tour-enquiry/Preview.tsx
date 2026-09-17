import { VietTourEnquiryView, type VietTourEnquiryContent } from "./View";
import type { CollectionEntry, ContentGraph } from "../../../../../types";
import { selectTourCatalogueEntries } from "../../tourModel";
export function Preview({ content, subject, graph }: { content: VietTourEnquiryContent; subject?: CollectionEntry; graph?: ContentGraph }) {
  const tourOptions = content.tourOptions?.length ? content.tourOptions : graph ? selectTourCatalogueEntries(graph, { collectionId: content.collectionId, includeDraft: true }).map((tour) => ({ value: tour.id, label: tour.title })) : [];
  return <VietTourEnquiryView content={{ ...content, tourOptions }} preview currentTourId={subject?.collectionId ? subject.id : ""} currentTourTitle={subject?.collectionId ? subject.title : ""} />;
}
