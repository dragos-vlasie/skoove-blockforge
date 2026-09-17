import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createBlocksFromBlueprint,
  getBlueprintsForCreation,
} from "../../blueprints/registry";
import { getEntryPath, getPagePath } from "../../lib/cms/routing";
import { getEnabledCollectionPresets } from "../../packs/registry";
import { createPreviewThemeStyle } from "./previewTheme";
import { PreviewFrame } from "./PreviewFrame";
import { TemplatePreview } from "../TemplatePreview";
import {
  createFieldDomId,
  createFieldKey,
  emptyCreateDraft,
  emptySeo,
  missingRequiredField,
  slugify,
  trimRoute,
} from "../contentUtils";
import { FieldValueInput } from "../blockEditor";
import { SvgIcon } from "../icons";
import { CmsDialog } from "../primitives/CmsDialog";
import { invalidFieldClass } from "../constants";
import { selectChromeClass, TextInput } from "../ui";
import type { CreateContentDraft, CreateContentInput } from "../types";
import type {
  BlueprintFieldDefinition,
  CollectionDefinition,
  CollectionEntry,
  ContentBlueprintDefinition,
  ContentGraph,
  FieldDefinition,
  PageContent,
} from "../../../types";

type CreateStage = "layout" | "details";
type PreviewDevice = "desktop" | "tablet" | "mobile";

const previewDevices = [
  { id: "desktop", label: "Desktop", icon: "desktop", width: 1280 },
  { id: "tablet", label: "Tablet", icon: "tablet", width: 768 },
  { id: "mobile", label: "Mobile", icon: "mobile", width: 390 },
] as const;

const mergeFields = (
  blueprintFields: readonly BlueprintFieldDefinition[],
  collectionFields: readonly FieldDefinition[],
) => {
  const fields = new Map<string, BlueprintFieldDefinition>();
  [...blueprintFields, ...collectionFields].forEach((field) => {
    const existing = fields.get(field.id);
    fields.set(field.id, {
      ...existing,
      ...field,
      required: Boolean(existing?.required || field.required),
    });
  });
  return [...fields.values()];
};

function DetailsField({
  id,
  label,
  required = false,
  error = "",
  className = "",
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-semibold text-[#344054]">
        {label}
        {required && (
          <span className="ml-1 text-rose-600" aria-label="required">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[12px] font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

function BlueprintPreview({
  blueprint,
  definition,
  graph,
  title,
  fields,
}: {
  blueprint: ContentBlueprintDefinition | undefined;
  definition?: CollectionDefinition | null;
  graph: ContentGraph;
  title: string;
  fields: Record<string, any>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setViewportWidth(viewport.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
  }, [blueprint?.id, device]);

  if (!blueprint) {
    return (
      <div className="grid h-full min-h-72 place-items-center bg-white text-center">
        <div>
          <p className="text-sm font-semibold text-[#475467]">Choose a layout</p>
          <p className="mt-1 text-[12px] text-[#667085]">
            Its live preview will appear here.
          </p>
        </div>
      </div>
    );
  }

  const previewWidth =
    previewDevices.find((candidate) => candidate.id === device)?.width ?? 1280;
  const previewScale =
    viewportWidth > 0
      ? Math.min(1, Math.max(0.25, (viewportWidth - 1) / previewWidth))
      : 0.5;
  const blocks = createBlocksFromBlueprint(blueprint, {
    title: title || blueprint.preview?.title || blueprint.name,
    fields,
    collection: definition,
  });
  const common = {
    id: "blueprint-preview",
    title: title || blueprint.preview?.title || blueprint.name,
    slug: "preview",
    status: "draft" as const,
    templateId: blueprint.templateId,
    seo: emptySeo(title || blueprint.name),
    blocks,
    updatedAt: "",
  };
  const item: PageContent | CollectionEntry =
    blueprint.subject === "entry"
      ? {
          ...common,
          kind: "collectionEntry",
          collectionId: definition?.id ?? "collection-preview",
          categoryIds: [],
          fields,
        }
      : {
          ...common,
          kind: "page",
          order: 0,
          parentId: null,
          showInNavigation: false,
        };

  return (
    <section className="flex h-full min-h-0 flex-col bg-white" aria-label="Layout preview">
      <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[#e4e7ec] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#172033]">
            {blueprint.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#667085]">
            {blueprint.blocks.length} sections · Live preview
          </p>
        </div>
        <div className="flex rounded-lg border border-[#d9dee7] bg-[#f8fafc] p-0.5">
          {previewDevices.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setDevice(candidate.id)}
              aria-label={`${candidate.label} layout preview`}
              aria-pressed={device === candidate.id}
              className={`grid h-8 min-w-8 place-items-center rounded-md px-2 transition ${
                device === candidate.id
                  ? "bg-white text-[#6d5dfc] shadow-sm"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <SvgIcon name={candidate.icon} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto bg-white">
        {blocks.length > 0 ? (
          <div
            className="flex min-h-full justify-center"
            style={{ minWidth: `${previewWidth * previewScale}px` }}
          >
            <PreviewFrame
              expandToContent
              label={`${blueprint.name} ${device} preview`}
              width={previewWidth}
              scale={previewScale}
              themeDesign={graph.site.design}
              themeStyle={createPreviewThemeStyle(graph.site)}
              themeId={graph.site.design?.themeId}
            >
              <TemplatePreview
                item={item}
                graph={graph}
                definition={definition}
                activeBlockId={null}
                activeFieldPath={null}
                onSelectBlock={() => undefined}
                onSelectField={() => undefined}
                onSelectItemField={() => undefined}
                onMoveBlock={() => undefined}
                onDuplicateBlock={() => undefined}
                onRemoveBlock={() => undefined}
                onOpenSectionPicker={() => undefined}
              />
            </PreviewFrame>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center bg-[#f8fafc] p-8 text-center">
            <div className="max-w-xs">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#d9dee7] bg-white text-[#6d5dfc]">
                <SvgIcon name="plus" className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-[#172033]">
                Clean canvas
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#667085]">
                Create the page first, then add only the sections it needs.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function CreateContentModal({
  open,
  graph,
  initialType,
  onCreatePage,
  onCreateEntry,
  onClose,
  onCreated,
}: {
  open: boolean;
  graph: ContentGraph;
  initialType?: string;
  onCreatePage: (input?: CreateContentInput) => void;
  onCreateEntry: (
    definition: CollectionDefinition,
    input?: CreateContentInput,
  ) => void;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [stage, setStage] = useState<CreateStage>("layout");
  const [createDraft, setCreateDraft] = useState<CreateContentDraft>(() =>
    emptyCreateDraft(),
  );
  const [search, setSearch] = useState("");
  const [createTouched, setCreateTouched] = useState<Record<string, boolean>>({});
  const [createAttempted, setCreateAttempted] = useState(false);
  const createErrorSummaryRef = useRef<HTMLDivElement | null>(null);
  const stageHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const installedCollectionPresets = getEnabledCollectionPresets(
    graph.site.enabledPacks,
  );
  const availableDefinitions = useMemo(() => {
    const existingIds = new Set(
      graph.collectionDefinitions.map((definition) => definition.id),
    );
    return [
      ...graph.collectionDefinitions,
      ...installedCollectionPresets.filter(
        (definition) => !existingIds.has(definition.id),
      ),
    ];
  }, [graph.collectionDefinitions, installedCollectionPresets]);
  const createDefinition = availableDefinitions.find(
    (candidate) => candidate.id === createDraft.type,
  );
  const subject = createDraft.type === "page" ? "page" : "entry";
  const blueprints = getBlueprintsForCreation(
    graph.site.enabledPacks,
    graph.customBlueprints,
    subject,
    createDefinition,
  );
  const filteredBlueprints = blueprints.filter((blueprint) =>
    `${blueprint.name} ${blueprint.description} ${blueprint.outcome}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const selectedBlueprint =
    blueprints.find((blueprint) => blueprint.id === createDraft.blueprintId) ??
    blueprints[0];
  const blueprintFields = selectedBlueprint?.essentialFields ?? [];
  const requiredCollectionFields =
    createDefinition?.fields.filter((field) => field.required) ?? [];
  const essentialFields = mergeFields(
    blueprintFields,
    requiredCollectionFields,
  );
  const requiredFields = essentialFields.filter((field) => field.required);

  useEffect(() => {
    if (!open) return;
    const type =
      initialType &&
      (initialType === "page" ||
        availableDefinitions.some((definition) => definition.id === initialType))
        ? initialType
        : "page";
    const definition = availableDefinitions.find(
      (candidate) => candidate.id === type,
    );
    const nextSubject = type === "page" ? "page" : "entry";
    const nextBlueprints = getBlueprintsForCreation(
      graph.site.enabledPacks,
      graph.customBlueprints,
      nextSubject,
      definition,
    );
    const next = emptyCreateDraft();
    next.type = type;
    next.blueprintId =
      nextBlueprints.find(
        (blueprint) => blueprint.id === "travel-agency.tour-detail",
      )?.id ??
      nextBlueprints[0]?.id ??
      "";
    next.requiredFields = Object.fromEntries(
      [
        ...(nextBlueprints.find(
          (blueprint) => blueprint.id === next.blueprintId,
        )?.essentialFields ?? []),
        ...(definition?.fields.filter((field) => field.required) ?? []),
      ].map((field) => [
        field.id,
        ("defaultValue" in field ? field.defaultValue : undefined) ??
          (field.type === "boolean" ? false : ""),
      ]),
    );
    setCreateDraft(next);
    setStage("layout");
    setSearch("");
    setCreateTouched({});
    setCreateAttempted(false);
  }, [open, initialType]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => stageHeadingRef.current?.focus());
  }, [stage, open]);

  const createTitle = createDraft.title.trim();
  const createSlug = slugify(createDraft.slug || createDraft.title);
  const siblingPages = graph.pages.filter(
    (candidate) =>
      (candidate.parentId ?? null) === (createDraft.parentId || null),
  );
  const siblingEntries = createDefinition
    ? graph.entries.filter(
        (candidate) => candidate.collectionId === createDefinition.id,
      )
    : [];
  const fieldErrors: Record<string, string> = {};
  const setError = (key: string, message: string) => {
    if (!fieldErrors[key]) fieldErrors[key] = message;
  };

  if (!createTitle) {
    setError("title", "Enter a title.");
  } else if (
    subject === "page" &&
    siblingPages.some(
      (candidate) =>
        candidate.title.trim().toLowerCase() === createTitle.toLowerCase(),
    )
  ) {
    setError("title", "A page with this title already exists here.");
  } else if (
    createDefinition &&
    siblingEntries.some(
      (candidate) =>
        candidate.title.trim().toLowerCase() === createTitle.toLowerCase(),
    )
  ) {
    setError(
      "title",
      `A ${createDefinition.singularName.toLowerCase()} with this title already exists.`,
    );
  }

  if (
    subject === "page" &&
    siblingPages.some((candidate) => slugify(candidate.slug) === createSlug)
  ) {
    setError("slug", "A page with this URL already exists here.");
  } else if (
    createDefinition &&
    siblingEntries.some((candidate) => slugify(candidate.slug) === createSlug)
  ) {
    setError(
      "slug",
      `A ${createDefinition.singularName.toLowerCase()} with this URL already exists.`,
    );
  }
  requiredFields.forEach((field) => {
    if (
      missingRequiredField(
        { ...field, required: Boolean(field.required) },
        createDraft.requiredFields[field.id],
      )
    ) {
      setError(createFieldKey(field.id), `${field.label} is required.`);
    }
  });

  const errors = Object.values(fieldErrors);
  const fieldState = (key: string) => {
    const error =
      createAttempted || createTouched[key] ? fieldErrors[key] ?? "" : "";
    const id = createFieldDomId(key);
    return {
      id,
      error,
      invalid: Boolean(error),
      describedBy: error ? `${id}-error` : undefined,
      inputClass: error ? invalidFieldClass : "",
    };
  };
  const titleField = fieldState("title");
  const slugField = fieldState("slug");

  useEffect(() => {
    if (createAttempted && errors.length > 0) {
      createErrorSummaryRef.current?.focus();
    }
  }, [createAttempted, errors.length]);

  const setType = (type: string) => {
    const definition = availableDefinitions.find(
      (candidate) => candidate.id === type,
    );
    const nextSubject = type === "page" ? "page" : "entry";
    const nextBlueprints = getBlueprintsForCreation(
      graph.site.enabledPacks,
      graph.customBlueprints,
      nextSubject,
      definition,
    );
    const preferred =
      nextBlueprints.find(
        (blueprint) => blueprint.id === "travel-agency.tour-detail",
      ) ?? nextBlueprints[0];
    setCreateDraft((current) => ({
      ...current,
      type,
      parentId: type === "page" ? current.parentId : "",
      blueprintId: preferred?.id ?? "",
      requiredFields: Object.fromEntries(
        [
          ...(preferred?.essentialFields ?? []),
          ...(definition?.fields.filter((field) => field.required) ?? []),
        ].map((field) => [
          field.id,
          ("defaultValue" in field ? field.defaultValue : undefined) ??
            (field.type === "boolean" ? false : ""),
        ]),
      ),
    }));
  };
  const selectBlueprint = (blueprint: ContentBlueprintDefinition) => {
    setCreateDraft((current) => ({
      ...current,
      blueprintId: blueprint.id,
      requiredFields: {
        ...Object.fromEntries(
          (blueprint.essentialFields ?? []).map((field) => [
            field.id,
            field.defaultValue ?? (field.type === "boolean" ? false : ""),
          ]),
        ),
        ...current.requiredFields,
      },
    }));
  };
  const updateTitle = (title: string) => {
    setCreateDraft((current) => {
      const previousSlug = slugify(current.title);
      const syncSlug = !current.slug || slugify(current.slug) === previousSlug;
      const syncSeoTitle =
        !current.seoTitle || current.seoTitle === current.title;
      return {
        ...current,
        title,
        slug: syncSlug ? slugify(title) : current.slug,
        seoTitle: syncSeoTitle ? title : current.seoTitle,
      };
    });
  };
  const close = () => {
    onClose();
    setCreateTouched({});
    setCreateAttempted(false);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (stage === "layout") {
      if (!selectedBlueprint) return;
      setStage("details");
      return;
    }

    setCreateAttempted(true);
    setCreateTouched(
      Object.fromEntries(
        [
          "title",
          "slug",
          ...requiredFields.map((field) => createFieldKey(field.id)),
        ].map((key) => [key, true]),
      ),
    );
    if (errors.length > 0) return;

    const summary = String(
      createDraft.requiredFields.summary ??
        selectedBlueprint?.defaults?.seoDescription ??
        "",
    ).trim();
    const input: CreateContentInput = {
      title: createTitle,
      slug: createSlug,
      status: createDraft.status,
      seoTitle: createDraft.seoTitle.trim() || createTitle,
      seoDescription:
        createDraft.seoDescription.trim() ||
        summary ||
        graph.site.defaultDescription,
      parentId: subject === "page" ? createDraft.parentId || null : undefined,
      fields: createDraft.requiredFields,
      blueprintId: selectedBlueprint?.id,
    };

    if (subject === "page") onCreatePage(input);
    else if (createDefinition) onCreateEntry(createDefinition, input);
    close();
    onCreated();
  };

  if (!open) return null;

  const contentLabel =
    subject === "page"
      ? "page"
      : createDefinition?.singularName.toLowerCase() ?? "content";
  const createPathPreview =
    subject === "page"
      ? (() => {
          const parent = graph.pages.find(
            (candidate) => candidate.id === createDraft.parentId,
          );
          const parentPath = parent
            ? trimRoute(getPagePath(parent, graph))
            : "";
          return `/${[parentPath, createSlug].filter(Boolean).join("/")}/`.replace(
            /\/{2,}/g,
            "/",
          );
        })()
      : createDefinition
        ? getEntryPath(
            {
              id: "preview",
              kind: "collectionEntry",
              collectionId: createDefinition.id,
              title: createTitle || createDefinition.singularName,
              slug: createSlug,
              status: "draft",
              seo: emptySeo(createTitle || createDefinition.singularName),
              blocks: [],
              updatedAt: "",
              categoryIds: [],
              fields: {},
            },
            createDefinition,
            graph,
          )
        : "/";

  return (
    <CmsDialog
      open
      onClose={close}
      eyebrow={stage === "layout" ? "Create" : undefined}
      title={stage === "layout" ? "Choose content and layout" : `Create ${contentLabel}`}
      description={
        stage === "layout"
          ? "Choose what you are creating, then start from an approved layout for this website."
          : "Add enough information to create the draft. You can complete everything else in the editor."
      }
      maxWidthClassName={
        stage === "layout" ? "sm:!max-w-[90rem]" : "sm:!max-w-[60rem]"
      }
      contentClassName={
        stage === "layout" ? "!overflow-clip sm:!h-[90vh]" : "!overflow-clip"
      }
      headerClassName={stage === "details" ? "!static sm:!py-3.5" : "!static"}
      bodyClassName={
        stage === "layout"
          ? "relative min-h-0 !overflow-clip p-0"
          : "min-h-0 !bg-white p-0"
      }
      footerClassName="!static"
      formProps={{ onSubmit: submit, noValidate: true }}
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          {stage === "details" ? (
            <button
              type="button"
              onClick={() => setStage("layout")}
              className="min-h-11 rounded-lg border border-[#d9dee7] bg-white px-4 text-sm font-semibold text-[#475467] hover:border-[#c7b8ff] hover:text-[#4f3fe0]"
            >
              Back
            </button>
          ) : (
            <p className="text-[12px] font-medium text-[#667085]">
              Existing content is never changed by choosing a blueprint.
            </p>
          )}
          <div className="flex items-center gap-3">
            {stage === "details" && (
              <span className="hidden text-[12px] font-medium text-[#667085] sm:inline">
                Creates as a draft
              </span>
            )}
            <button
              type="submit"
              disabled={stage === "layout" && !selectedBlueprint}
              className="min-h-11 rounded-lg bg-[#6d5dfc] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#5b4bea] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stage === "layout"
                ? "Continue"
                : `Create ${contentLabel}`}
            </button>
          </div>
        </div>
      )}
    >
      {stage === "layout" ? (
        <div className="absolute inset-0 grid min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-[#e4e7ec] bg-white">
            <div className="space-y-3 border-b border-[#e4e7ec] p-3">
              <h2 ref={stageHeadingRef} tabIndex={-1} className="sr-only">
                Choose content type and layout
              </h2>
              <div className="grid gap-1.5">
                <label htmlFor="create-content-type" className="text-[12px] font-semibold text-[#344054]">
                  Content type
                </label>
                <select
                  id="create-content-type"
                  value={createDraft.type}
                  onChange={(event) => setType(event.target.value)}
                  className={selectChromeClass}
                >
                  <option value="page">Page</option>
                  {availableDefinitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.singularName}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] leading-4 text-[#667085]">
                  Only content types enabled for {graph.site.siteName || "this website"} appear here.
                </p>
              </div>
              <label className="relative block">
                <span className="sr-only">Search layouts</span>
                <SvgIcon
                  name="search"
                  className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#98a2b3]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  placeholder="Search layouts..."
                  className="h-11 w-full rounded-lg border border-[#d9dee7] bg-white pl-9 pr-3 text-sm text-[#172033] outline-none focus:border-[#9b8cff] focus:ring-4 focus:ring-[#eeeaff]"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3" role="radiogroup" aria-label={`${contentLabel} layouts`}>
              <div className="space-y-2">
                {filteredBlueprints.map((blueprint) => {
                  const selected = selectedBlueprint?.id === blueprint.id;
                  return (
                    <label
                      key={blueprint.id}
                      className={`grid cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-3 transition ${
                        selected
                          ? "border-[#9b8cff] bg-[#f6f4ff] shadow-sm"
                          : "border-[#e4e7ec] bg-white hover:border-[#c7b8ff]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="content-blueprint"
                        value={blueprint.id}
                        checked={selected}
                        onChange={() => selectBlueprint(blueprint)}
                        className="sr-only"
                      />
                      <span className={`grid h-11 w-11 place-items-center rounded-lg ${
                        selected
                          ? "bg-[#6d5dfc] text-white"
                          : "bg-[#f2f4f7] text-[#667085]"
                      }`}>
                        <SvgIcon
                          name={
                            blueprint.category === "blank"
                              ? "plus"
                              : blueprint.subject === "entry"
                                ? "collections"
                                : "content"
                          }
                          className="h-5 w-5"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <strong className="text-sm text-[#172033]">
                            {blueprint.name}
                          </strong>
                          {blueprint.packId === "travel-agency" && (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                              Travel Agency
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-[#667085]">
                          {blueprint.outcome}
                        </span>
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium text-[#98a2b3]">
                        {blueprint.blocks.length}
                      </span>
                    </label>
                  );
                })}
                {filteredBlueprints.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm font-semibold text-[#475467]">
                      No layouts found
                    </p>
                    <p className="mt-1 text-[11px] text-[#667085]">
                      Try another search or content type.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
          <div className="min-h-0 overflow-hidden bg-white">
            <BlueprintPreview
              blueprint={selectedBlueprint}
              definition={createDefinition}
              graph={graph}
              title={createDraft.title}
              fields={createDraft.requiredFields}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white">
          <h2 ref={stageHeadingRef} tabIndex={-1} className="sr-only">
            {subject === "page" ? "Page details" : `${createDefinition?.singularName ?? "Content"} details`}
          </h2>

          <div className="flex items-center gap-3 border-b border-[#e4e7ec] bg-[#f7f5ff] px-4 py-2.5 sm:px-6">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d7ceff] bg-white text-[#5f50e6]">
              <SvgIcon
                name={subject === "entry" ? "collections" : "content"}
                className="h-4 w-4"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#172033]">
                Using {selectedBlueprint?.name}
              </p>
              <p className="truncate text-[11px] text-[#667085]">
                {selectedBlueprint?.blocks.length ?? 0} sections · {selectedBlueprint?.outcome}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStage("layout")}
              aria-label={`Change ${selectedBlueprint?.name ?? "selected"} layout`}
              className="min-h-9 shrink-0 rounded-lg px-3 text-[12px] font-semibold text-[#4f3fe0] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b8cff]"
            >
              Change
            </button>
          </div>

          <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
            {createAttempted && errors.length > 0 && (
              <div
                ref={createErrorSummaryRef}
                tabIndex={-1}
                role="alert"
                className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 outline-none focus:ring-4 focus:ring-rose-100"
              >
                <p className="text-sm font-semibold text-rose-700">
                  Fix the required information
                </p>
                {errors.map((error) => (
                  <p key={error} className="mt-1 text-[12px] text-rose-700">
                    {error}
                  </p>
                ))}
              </div>
            )}

            <div className="divide-y divide-[#eef1f5] overflow-hidden rounded-xl border border-[#e4e7ec] bg-white">
              <section className="p-4 sm:p-5">
                <DetailsField
                  id={titleField.id}
                  label={subject === "page" ? "Page title" : `${createDefinition?.singularName ?? "Content"} name`}
                  required
                  error={titleField.error}
                >
                  <TextInput
                    id={titleField.id}
                    value={createDraft.title}
                    onChange={(event) => updateTitle(event.target.value)}
                    onBlur={() =>
                      setCreateTouched((current) => ({
                        ...current,
                        title: true,
                      }))
                    }
                    aria-invalid={titleField.invalid || undefined}
                    aria-describedby={
                      [titleField.describedBy, "create-path-preview"]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    className={titleField.inputClass}
                    placeholder={subject === "page" ? "About our company" : "Journey name"}
                  />
                </DetailsField>
                <div className="mt-5 border-t border-[#eef1f5] pt-4">
                  <div className="mb-3">
                    <p className="text-[13px] font-semibold text-[#344054]">
                      Public address
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#667085]">
                      Generated from the {subject === "page" ? "title" : "name"}, but always editable.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailsField id={slugField.id} label="URL slug" error={slugField.error}>
                      <TextInput
                        id={slugField.id}
                        value={createDraft.slug}
                        onChange={(event) =>
                          setCreateDraft((current) => ({
                            ...current,
                            slug: event.target.value,
                          }))
                        }
                        aria-invalid={slugField.invalid || undefined}
                        aria-describedby={slugField.describedBy}
                        className={slugField.inputClass}
                      />
                    </DetailsField>
                    {subject === "page" && (
                      <DetailsField id="create-parent" label="Parent page">
                        <select
                          id="create-parent"
                          className={selectChromeClass}
                          value={createDraft.parentId}
                          onChange={(event) =>
                            setCreateDraft((current) => ({
                              ...current,
                              parentId: event.target.value,
                            }))
                          }
                        >
                          <option value="">No parent</option>
                          {graph.pages.map((page) => (
                            <option key={page.id} value={page.id}>
                              {page.title}
                            </option>
                          ))}
                        </select>
                      </DetailsField>
                    )}
                  </div>
                  <p id="create-path-preview" className="mt-3 text-[11px] leading-5 text-[#667085]">
                    Final address: <span className="font-mono font-medium text-[#475467]">{createPathPreview}</span>
                  </p>
                </div>
              </section>

              {essentialFields.length > 0 && (
                <section className="p-4 sm:p-5">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-[#172033]">
                      {subject === "entry" ? `${createDefinition?.singularName ?? "Content"} essentials` : "Page essentials"}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-5 text-[#667085]">
                      Add the information this layout needs to create the draft.
                    </p>
                  </div>
                  <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
                    {essentialFields.map((field) => {
                      const state = fieldState(createFieldKey(field.id));
                      const isWide =
                        field.type === "textarea" ||
                        field.type === "richText" ||
                        field.type === "image";
                      return (
                        <DetailsField
                          key={field.id}
                          id={state.id}
                          label={field.label}
                          required={field.required}
                          error={state.error}
                          className={isWide ? "md:col-span-2" : ""}
                        >
                          <FieldValueInput
                            field={{
                              id: field.id,
                              label: field.label,
                              type: field.type,
                              required: Boolean(field.required),
                            }}
                            inputId={state.id}
                            value={createDraft.requiredFields[field.id]}
                            onChange={(value) =>
                              setCreateDraft((current) => ({
                                ...current,
                                requiredFields: {
                                  ...current.requiredFields,
                                  [field.id]: value,
                                },
                              }))
                            }
                            assets={graph.assets}
                            invalid={state.invalid}
                            describedBy={state.describedBy}
                            className={state.inputClass}
                          />
                        </DetailsField>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </CmsDialog>
  );
}
