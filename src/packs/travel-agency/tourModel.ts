import { BlockType, type CollectionDefinition, type CollectionEntry, type ContentGraph } from "../../../types";
import { getEntryPath } from "../../lib/cms/routing";
import type { VietDepartureScheduleContent } from "./blocks/viet-departure-schedule/View";
import type { VietTourPackageContent } from "./blocks/viet-tour-package/View";
import type { VietTourCatalogueContent, VietTourCatalogueEntry } from "./blocks/viet-tour-catalogue/View";
import type { VietTourOverviewContent } from "./blocks/viet-tour-overview/View";

export const defaultToursCollectionId = "collection-tours";
/** @deprecated Retained while existing installations migrate from the original type names. */
export const vietToursCollectionId = defaultToursCollectionId;

const text = (value: unknown) => String(value ?? "").trim();

const numericPrice = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const digits = text(value).replace(/[^0-9]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

export const formatTourPrice = (
  amount: number | null,
  {
    locale = "en-US",
    currency = "USD",
    contactLabel = "Contact us",
  }: {
    locale?: string;
    currency?: string;
    contactLabel?: string;
  } = {},
) => {
  if (amount == null) return contactLabel;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(locale).format(amount)} ${currency}`;
  }
};

export const getTourScheduleBlock = (entry: CollectionEntry) =>
  entry.blocks.find((block) => block.type === BlockType.TRAVEL_DEPARTURE_SCHEDULE);

export const getTourOverviewBlock = (entry: CollectionEntry) =>
  entry.blocks.find((block) => block.type === BlockType.TRAVEL_TOUR_OVERVIEW);

export const getTourPackageBlocks = (entry: CollectionEntry) =>
  entry.blocks.filter((block) => block.type === BlockType.TRAVEL_TOUR_PACKAGE);

export const getTourSchedule = (entry: CollectionEntry): VietDepartureScheduleContent =>
  (getTourScheduleBlock(entry)?.content ?? {}) as VietDepartureScheduleContent;

export const getTourFromPrice = (entry: CollectionEntry) => {
  const packageDepartures = getTourPackageBlocks(entry).flatMap((block) =>
    (((block.content ?? {}) as VietTourPackageContent).departures ?? []),
  );
  const departures = packageDepartures.length ? packageDepartures : (getTourSchedule(entry).departures ?? []);
  const prices = departures
    .map((departure) => numericPrice(departure.price))
    .filter((amount): amount is number => amount != null);
  return prices.length ? Math.min(...prices) : null;
};

export const getTourCollection = (
  graph: ContentGraph,
  collectionId = defaultToursCollectionId,
): CollectionDefinition | undefined =>
  graph.collectionDefinitions.find((definition) => definition.id === collectionId);

export const toTourCatalogueEntry = (
  entry: CollectionEntry,
  graph: ContentGraph,
  query: TourCatalogueQuery = {},
): VietTourCatalogueEntry => {
  const definition = getTourCollection(graph, query.collectionId);
  const fields = entry.fields ?? {};
  const overview = getTourOverviewBlock(entry)?.content ?? {};
  const price = getTourFromPrice(entry);
  const packageCount = Number(fields.packageCount || getTourPackageBlocks(entry).length || 0);

  return {
    id: entry.id,
    title: text(overview.title || entry.title),
    href: getEntryPath(entry, definition, graph),
    image: text(fields.cardImage || overview.image || fields.heroImage || entry.seo.ogImage),
    imageAlt: text(fields.cardImageAlt || overview.imageAlt || fields.heroImageAlt || entry.title),
    eyebrow: packageCount > 1 ? `${packageCount} tour options` : text(fields.transportSummary || "One tour option"),
    summary: text(overview.summary || fields.summary || entry.excerpt),
    duration: text(fields.durationRange || fields.duration),
    route: text(fields.transportSummary || fields.routeDisplay || entry.title),
    price: formatTourPrice(price, {
      locale: query.locale,
      currency: query.currency,
      contactLabel: query.contactPriceLabel,
    }),
    badge: text(fields.badge || (fields.shoppingPolicy === "no-shopping" ? "No shopping" : "")),
  };
};

export type TourCatalogueQuery = VietTourCatalogueContent & {
  collectionId?: string;
  locale?: string;
  currency?: string;
  contactPriceLabel?: string;
  featuredOnly?: boolean;
  categoryId?: string;
  limit?: number;
  includeDraft?: boolean;
};

export const selectTourCatalogueEntries = (
  graph: ContentGraph,
  query: TourCatalogueQuery = {},
) => {
  const collectionId = query.collectionId || defaultToursCollectionId;
  const entries = graph.entries
    .filter((entry) => entry.collectionId === collectionId)
    .filter((entry) => query.includeDraft ? entry.status !== "archived" : entry.status === "published")
    .filter((entry) => !query.featuredOnly || Boolean(entry.fields?.featured))
    .filter((entry) => !query.categoryId || entry.categoryIds.includes(query.categoryId))
    .sort((left, right) => Number(left.fields?.sourceOrder ?? 9999) - Number(right.fields?.sourceOrder ?? 9999));

  const limit = Number(query.limit || 0);
  return (limit > 0 ? entries.slice(0, limit) : entries).map((entry) => toTourCatalogueEntry(entry, graph, query));
};

export const buildTourOverview = (
  entry: CollectionEntry,
  graph: ContentGraph,
  query: TourCatalogueQuery = {},
): VietTourOverviewContent => {
  const fields = entry.fields ?? {};
  const categories = entry.categoryIds
    .map((categoryId) => graph.categories.find((category) => category.id === categoryId)?.name)
    .filter(Boolean);

  return {
    eyebrow: text(fields.overviewEyebrow || fields.badge || categories[0] || "Selected journey"),
    title: entry.title,
    summary: text(fields.summary || entry.excerpt),
    image: text(fields.heroImage || entry.seo.ogImage),
    imageAlt: text(fields.heroImageAlt || entry.title),
    priceLabel: text(fields.priceFromLabel) || "From",
    price: formatTourPrice(getTourFromPrice(entry), {
      locale: query.locale,
      currency: query.currency,
      contactLabel: query.contactPriceLabel,
    }),
    facts: [
      { label: text(fields.durationFactLabel) || "Duration", value: text(fields.durationRange || fields.duration) || "To be confirmed" },
      { label: text(fields.transportFactLabel) || "Transport", value: text(fields.transportSummary || fields.transportLabel || fields.carrierName) || "To be confirmed" },
      { label: text(fields.departureFactLabel) || "Departure", value: text(fields.departureFrom) || "To be confirmed" },
      { label: text(fields.formatFactLabel) || "Travel style", value: fields.shoppingPolicy === "no-shopping" ? "No shopping stops" : fields.shoppingPolicy === "shopping" ? "Shopping included" : "As described in the programme" },
    ],
    primaryLabel: text(fields.primaryLabel) || "Plan this trip",
    primaryHref: "#travel-enquiry",
    backLabel: text(fields.backLabel) || "All tours",
    backHref: "/tours/",
  };
};

export const getTourEntry = (
  graph: ContentGraph,
  id: string,
  collectionId = defaultToursCollectionId,
) =>
  graph.entries.find((entry) => entry.id === id && entry.collectionId === collectionId);
