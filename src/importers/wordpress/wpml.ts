import type { ContentGraph, LocalizedRecord } from "../../../types";
import { canonicalLocaleCode, getContentLocale } from "../../localization/registry";

export type WpmlTranslationRow = {
  element_type: "post_post" | "post_page" | "tax_category" | "tax_post_tag";
  element_id: number;
  /** Required for taxonomy rows: WPML element_id is term_taxonomy_id, not term_id. */
  term_id?: number;
  trid: number;
  language_code: string;
};

const collectionFor = (graph: ContentGraph, type: WpmlTranslationRow["element_type"]) => {
  if (type === "post_post") return { records: graph.entries, prefix: "wp-post-" };
  if (type === "post_page") return { records: graph.pages, prefix: "wp-page-" };
  return { records: graph.categories, prefix: type === "tax_category" ? "wp-category-" : "wp-tag-" };
};

/** Apply only rows verified against an imported source ID and its locale. */
export function applyWpmlTranslationExport(graph: ContentGraph, rows: unknown) {
  if (!Array.isArray(rows)) throw new Error("WPML export must be a JSON array.");
  const assignments: Array<{ record: LocalizedRecord; groupId: string }> = [];
  const seenRecords = new Set<string>();
  const seenGroups = new Set<string>();
  const unmatched: string[] = [];

  for (const value of rows) {
    const row = value as Partial<WpmlTranslationRow>;
    if (!row || !["post_post", "post_page", "tax_category", "tax_post_tag"].includes(String(row.element_type)) ||
      !Number.isSafeInteger(row.element_id) || !Number.isSafeInteger(row.trid) ||
      Number(row.element_id) <= 0 || Number(row.trid) <= 0 || typeof row.language_code !== "string") {
      throw new Error("WPML export contains an invalid translation row.");
    }
    const type = row.element_type as WpmlTranslationRow["element_type"];
    const isTaxonomy = type.startsWith("tax_");
    if (isTaxonomy && (!Number.isSafeInteger(row.term_id) || Number(row.term_id) <= 0)) {
      throw new Error(`WPML taxonomy row ${type}:${row.element_id} needs term_id joined from WordPress term_taxonomy.`);
    }
    const locale = canonicalLocaleCode(row.language_code);
    const { records, prefix } = collectionFor(graph, type);
    const id = `${prefix}${isTaxonomy ? row.term_id : row.element_id}`;
    const record = records.find((candidate) => candidate.id === id);
    if (!record) {
      unmatched.push(`${type}:${row.element_id}:${locale}`);
      continue;
    }
    if (getContentLocale(record, graph.site).toLowerCase() !== locale.toLowerCase()) {
      throw new Error(`WPML locale mismatch for ${type}:${row.element_id}: export says ${locale}, import says ${getContentLocale(record, graph.site)}.`);
    }
    const recordKey = `${type}:${id}`;
    const groupId = `wpml-${type}-${row.trid}`;
    const groupKey = `${groupId}:${locale.toLowerCase()}`;
    if (seenRecords.has(recordKey) || seenGroups.has(groupKey)) {
      throw new Error(`WPML export repeats a record or language in translation group ${groupId}.`);
    }
    if (record.translationGroupId && record.translationGroupId !== groupId) {
      throw new Error(`Imported record ${id} already belongs to translation group ${record.translationGroupId}.`);
    }
    seenRecords.add(recordKey);
    seenGroups.add(groupKey);
    assignments.push({ record, groupId });
  }

  if (unmatched.length > 0) {
    throw new Error(`WPML export has ${unmatched.length} rows absent from this import. First unmatched: ${unmatched.slice(0, 5).join(", ")}. Filter the export to imported posts, pages, categories, and tags.`);
  }
  assignments.forEach(({ record, groupId }) => { record.translationGroupId = groupId; });
  return { matched: assignments.length, groups: new Set(assignments.map((item) => item.groupId)).size };
}
