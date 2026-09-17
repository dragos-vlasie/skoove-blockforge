import { useMemo, useState } from "react";
import type {
  BlueprintAssignment,
  ContentBlueprintDefinition,
  ContentGraph,
} from "../../../types";
import { getEnabledBlueprints, getEnabledPatterns } from "../../packs/registry";
import {
  assessContentPatterns,
  type SubjectPatternAssessment,
} from "../../patterns/assessment";
import { CmsDialog } from "../primitives/CmsDialog";

type PatternAssessmentPanelProps = {
  graph: ContentGraph;
  onAssignBlueprint: (
    subject: SubjectPatternAssessment,
    blueprint: ContentBlueprintDefinition,
  ) => void;
  onKeepCustom: (subject: SubjectPatternAssessment) => void;
  onCreateBlueprint: (subject: SubjectPatternAssessment) => void;
  onOpenContent: (subject: SubjectPatternAssessment) => void;
};

const confidencePresentation = (
  level: SubjectPatternAssessment["confidenceLevel"],
) => {
  if (level === "high") {
    return {
      label: "Ready",
      dot: "bg-emerald-500",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (level === "review") {
    return {
      label: "Review",
      dot: "bg-amber-500",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "No match",
    dot: "bg-slate-400",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };
};

const assignmentFor = (
  assignments: readonly BlueprintAssignment[],
  subject: SubjectPatternAssessment,
) =>
  assignments.find(
    (assignment) =>
      assignment.subjectId === subject.subjectId &&
      assignment.subjectKind === subject.subjectKind,
  );

function CompactMetric({
  value,
  label,
  tone = "neutral",
}: {
  value: number;
  label: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-[#172033]";

  return (
    <span className="flex min-h-12 min-w-[9rem] flex-1 items-baseline gap-2 px-3 py-2">
      <strong className={`text-lg font-semibold tracking-[-0.03em] ${valueClass}`}>
        {value}
      </strong>
      <span className="whitespace-nowrap text-[12px] font-medium text-[#667085]">
        {label}
      </span>
    </span>
  );
}

function DecisionDialog({
  graph,
  subject,
  onAssign,
  onKeepCustom,
  onCreateBlueprint,
  onOpenContent,
  onClose,
}: {
  graph: ContentGraph;
  subject: SubjectPatternAssessment | null;
  onAssign: PatternAssessmentPanelProps["onAssignBlueprint"];
  onKeepCustom: PatternAssessmentPanelProps["onKeepCustom"];
  onCreateBlueprint: PatternAssessmentPanelProps["onCreateBlueprint"];
  onOpenContent: PatternAssessmentPanelProps["onOpenContent"];
  onClose: () => void;
}) {
  const blueprints = useMemo(() => {
    if (!subject) return [];
    return getEnabledBlueprints(
      graph.site.enabledPacks,
      graph.customBlueprints,
    )
      .filter((blueprint) => blueprint.subject === subject.subjectKind)
      .sort((left, right) => {
        const leftMatch = left.patternId === subject.patternId ? 1 : 0;
        const rightMatch = right.patternId === subject.patternId ? 1 : 0;
        return rightMatch - leftMatch;
      });
  }, [graph.customBlueprints, graph.site.enabledPacks, subject]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");

  if (!subject) return null;

  const selectedBlueprint =
    blueprints.find((blueprint) => blueprint.id === selectedBlueprintId) ??
    blueprints[0];
  const currentAssignment = assignmentFor(
    graph.blueprintAssignments ?? [],
    subject,
  );

  return (
    <CmsDialog
      open
      onClose={onClose}
      eyebrow="Builder tools"
      title={`Review ${subject.title}`}
      description="Confirm a reusable layout without changing the page’s current sections."
      maxWidthClassName="sm:max-w-3xl"
      bodyClassName="p-4 sm:p-5"
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onKeepCustom(subject);
              onClose();
            }}
            className="min-h-11 rounded-lg border border-[#d9dee7] bg-white px-4 text-sm font-semibold text-[#475467] hover:border-[#b8c0cc] hover:text-[#172033]"
          >
            Keep custom
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenContent(subject)}
              className="min-h-11 rounded-lg border border-[#d9dee7] bg-white px-4 text-sm font-semibold text-[#475467] hover:border-[#c7b8ff] hover:text-[#4f3fe0]"
            >
              Open in editor
            </button>
            <button
              type="button"
              disabled={!selectedBlueprint}
              onClick={() => {
                if (!selectedBlueprint) return;
                onAssign(subject, selectedBlueprint);
                onClose();
              }}
              className="min-h-11 rounded-lg bg-[#6d5dfc] px-5 text-sm font-semibold text-white hover:bg-[#5b4bea] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm layout
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#e4e7ec] bg-[#f8fafc] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#172033]">
                {subject.patternName}
              </p>
              <p className="mt-1 font-mono text-[11px] text-[#667085]">
                {subject.route}
              </p>
            </div>
            <span className="rounded-full border border-[#d9dee7] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475467]">
              {Math.round(subject.confidence * 100)}% match
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {subject.evidence.map((evidence) => (
              <span
                key={evidence.label}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#667085] shadow-sm"
              >
                {evidence.label}
              </span>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-[#172033]">
            Choose the layout this content should use
          </legend>
          <div className="mt-2 grid gap-2" role="radiogroup">
            {blueprints.map((blueprint, index) => {
              const selected =
                (selectedBlueprint?.id ?? blueprints[0]?.id) === blueprint.id;
              return (
                <label
                  key={blueprint.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    selected
                      ? "border-[#9b8cff] bg-[#f6f4ff]"
                      : "border-[#e4e7ec] bg-white hover:border-[#c7b8ff]"
                  }`}
                >
                  <input
                    type="radio"
                    name="pattern-blueprint"
                    value={blueprint.id}
                    checked={selected}
                    onChange={() => setSelectedBlueprintId(blueprint.id)}
                    className="mt-1 h-4 w-4 border-[#b8c0cc] text-[#6d5dfc] focus:ring-[#6d5dfc]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-[#172033]">
                        {blueprint.name}
                      </strong>
                      {blueprint.patternId === subject.patternId && (
                        <span className="rounded-full bg-[#ece9ff] px-2 py-0.5 text-[10px] font-semibold text-[#4f3fe0]">
                          Suggested
                        </span>
                      )}
                      {currentAssignment?.blueprintId === blueprint.id && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Assigned
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[12px] leading-5 text-[#667085]">
                      {blueprint.outcome}
                    </span>
                  </span>
                  <span className="text-[11px] font-medium text-[#98a2b3]">
                    {blueprint.blocks.length} sections
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e7ec] pt-4">
          <div>
            <p className="text-sm font-semibold text-[#172033]">
              Need a site-specific layout?
            </p>
            <p className="mt-0.5 text-[12px] text-[#667085]">
              Capture this page’s current section structure as a reusable blueprint.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onCreateBlueprint(subject);
              onClose();
            }}
            className="min-h-11 rounded-lg border border-[#c7b8ff] bg-white px-4 text-sm font-semibold text-[#4f3fe0] hover:bg-[#f6f4ff]"
          >
            Create from current layout
          </button>
        </div>
      </div>
    </CmsDialog>
  );
}

export function PatternAssessmentPanel({
  graph,
  onAssignBlueprint,
  onKeepCustom,
  onCreateBlueprint,
  onOpenContent,
}: PatternAssessmentPanelProps) {
  const assessment = assessContentPatterns(graph);
  const enabledPatterns = getEnabledPatterns(graph.site.enabledPacks);
  const assignments = graph.blueprintAssignments ?? [];
  const [reviewSubjectId, setReviewSubjectId] = useState<string | null>(null);
  const reviewSubject =
    assessment.subjects.find(
      (subject) =>
        `${subject.subjectKind}:${subject.subjectId}` === reviewSubjectId,
    ) ?? null;
  const repeatedClusters = assessment.clusters.filter(
    (cluster) => cluster.count > 1,
  );

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[#e4e7ec] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-[-0.03em] text-[#101828]">
                Pattern assessment
              </h1>
              <span className="rounded-full border border-[#d9dee7] bg-[#f8fafc] px-2 py-0.5 text-[10px] font-semibold text-[#667085]">
                Analysis only
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[#667085]">
              Find repeated page structures and turn approved matches into
              reusable blueprints. Confirming a layout never replaces existing
              content.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[#667085]">
            <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1">
              {enabledPatterns.length} patterns
            </span>
            <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1">
              {assignments.length} decisions
            </span>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-[#e4e7ec]">
          <div className="flex min-w-max divide-x divide-[#e4e7ec]">
            <CompactMetric
              value={assessment.totalSubjects}
              label="routes assessed"
            />
            <CompactMetric
              value={assessment.highConfidenceSubjects}
              label="ready"
              tone="positive"
            />
            <CompactMetric
              value={assessment.reviewSubjects}
              label="to review"
              tone="warning"
            />
            <CompactMetric
              value={assessment.customSubjects}
              label="custom"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
        <section className="rounded-xl border border-[#e4e7ec] bg-white">
          <div className="border-b border-[#e4e7ec] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#101828]">
              Recommended blueprint groups
            </h2>
            <p className="mt-0.5 text-[11px] text-[#667085]">
              Patterns detected across this website.
            </p>
          </div>
          <div className="divide-y divide-[#eef1f5]">
            {assessment.patternCounts.map((pattern) => {
              const representative = assessment.subjects.find(
                (subject) => subject.patternId === pattern.patternId,
              );
              return (
                <div
                  key={pattern.patternId}
                  className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f2efff] text-xs font-bold text-[#5b4bea]">
                    {pattern.count}
                  </span>
                  <span className="min-w-[12rem] flex-1">
                    <span className="block text-sm font-semibold text-[#172033]">
                      {pattern.patternName}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#667085]">
                      {pattern.packName ?? "Site-specific"} · {pattern.count}{" "}
                      route{pattern.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  {representative && (
                    <button
                      type="button"
                      onClick={() =>
                        setReviewSubjectId(
                          `${representative.subjectKind}:${representative.subjectId}`,
                        )
                      }
                      className="min-h-10 rounded-lg border border-[#d9dee7] bg-white px-3 text-[12px] font-semibold text-[#475467] hover:border-[#c7b8ff] hover:text-[#4f3fe0]"
                    >
                      Review
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-[#e4e7ec] bg-white">
          <div className="border-b border-[#e4e7ec] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#101828]">
              Repeated structures
            </h2>
            <p className="mt-0.5 text-[11px] text-[#667085]">
              Exact section sequences that can become custom blueprints.
            </p>
          </div>
          <div className="divide-y divide-[#eef1f5]">
            {repeatedClusters.length > 0 ? (
              repeatedClusters.slice(0, 6).map((cluster) => {
                const representative = assessment.subjects.find((subject) =>
                  cluster.subjectIds.includes(subject.subjectId),
                );
                return (
                  <div
                    key={cluster.id}
                    className="flex min-h-16 items-center gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#172033]">
                        {cluster.patternName}
                      </span>
                      <span className="mt-0.5 block line-clamp-1 text-[11px] text-[#667085]">
                        {cluster.label}
                      </span>
                    </span>
                    <span className="rounded-full bg-[#eef1f5] px-2 py-1 text-[10px] font-bold text-[#475467]">
                      {cluster.count} routes
                    </span>
                    {representative && (
                      <button
                        type="button"
                        aria-label={`Create blueprint from ${cluster.patternName}`}
                        onClick={() => onCreateBlueprint(representative)}
                        className="min-h-10 rounded-lg border border-[#c7b8ff] bg-white px-3 text-[12px] font-semibold text-[#4f3fe0] hover:bg-[#f6f4ff]"
                      >
                        Create blueprint
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-7 text-center">
                <p className="text-sm font-semibold text-[#475467]">
                  No repeated structures yet
                </p>
                <p className="mt-1 text-[11px] text-[#667085]">
                  Repeated layouts will appear as related content is added.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e4e7ec] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#101828]">
              Route recommendations
            </h2>
            <p className="mt-0.5 text-[11px] text-[#667085]">
              Review uncertain matches and record the intended layout.
            </p>
          </div>
          <p className="text-[11px] font-medium text-[#667085]">
            {assessment.matchedSubjects} of {assessment.totalSubjects} matched
          </p>
        </div>

        <div className="divide-y divide-[#eef1f5] md:hidden">
          {assessment.subjects.map((subject) => {
            const presentation = confidencePresentation(subject.confidenceLevel);
            const assignment = assignmentFor(assignments, subject);
            return (
              <article key={`${subject.subjectKind}:${subject.subjectId}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[#172033]">
                      {subject.title}
                    </h3>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-[#667085]">
                      {subject.route}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${presentation.className}`}>
                    {assignment?.status === "assigned"
                      ? "Assigned"
                      : assignment?.status === "custom"
                        ? "Custom"
                        : presentation.label}
                  </span>
                </div>
                <p className="mt-3 text-[12px] text-[#475467]">
                  {subject.patternName}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setReviewSubjectId(
                      `${subject.subjectKind}:${subject.subjectId}`,
                    )
                  }
                  className="mt-3 min-h-11 w-full rounded-lg border border-[#d9dee7] bg-white text-sm font-semibold text-[#475467]"
                >
                  Review suggestion
                </button>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e4e7ec] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-[0.08em] text-[#667085]">
                <th className="px-4 py-2.5">Content</th>
                <th className="px-4 py-2.5">Suggested layout</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1f5]">
              {assessment.subjects.map((subject) => {
                const presentation = confidencePresentation(subject.confidenceLevel);
                const assignment = assignmentFor(assignments, subject);
                return (
                  <tr
                    key={`${subject.subjectKind}:${subject.subjectId}`}
                    className="align-middle hover:bg-[#fbfcfe]"
                  >
                    <td className="px-4 py-3">
                      <p className="max-w-[18rem] truncate text-[13px] font-semibold text-[#172033]">
                        {subject.title}
                      </p>
                      <p className="mt-0.5 max-w-[18rem] truncate font-mono text-[10px] text-[#667085]">
                        {subject.route}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-semibold text-[#172033]">
                        {subject.patternName}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-[#667085]">
                        {subject.evidence.map((item) => item.label).join(" · ") ||
                          "No strong reusable pattern found"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${presentation.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${presentation.dot}`} />
                        {assignment?.status === "assigned"
                          ? "Assigned"
                          : assignment?.status === "custom"
                            ? "Custom"
                            : presentation.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setReviewSubjectId(
                            `${subject.subjectKind}:${subject.subjectId}`,
                          )
                        }
                        className="min-h-10 rounded-lg border border-[#d9dee7] bg-white px-3 text-[12px] font-semibold text-[#475467] hover:border-[#c7b8ff] hover:text-[#4f3fe0]"
                      >
                        {subject.confidenceLevel === "high"
                          ? "Confirm layout"
                          : subject.confidenceLevel === "review"
                            ? "Review suggestion"
                            : "Choose layout"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <DecisionDialog
        key={reviewSubjectId ?? "closed"}
        graph={graph}
        subject={reviewSubject}
        onAssign={onAssignBlueprint}
        onKeepCustom={onKeepCustom}
        onCreateBlueprint={onCreateBlueprint}
        onOpenContent={onOpenContent}
        onClose={() => setReviewSubjectId(null)}
      />
    </section>
  );
}
