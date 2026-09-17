import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const visualEditor = readFileSync(new URL("../src/cms/VisualPageEditor.tsx", import.meta.url), "utf8");
const blockEditor = readFileSync(new URL("../src/cms/blockEditor.tsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("../src/cms/ui.tsx", import.meta.url), "utf8");
const cmsController = readFileSync(new URL("../src/cms/useCmsController.ts", import.meta.url), "utf8");
const storageState = readFileSync(new URL("../src/cms/storageState.ts", import.meta.url), "utf8");
const cmsTypes = readFileSync(new URL("../src/cms/types.ts", import.meta.url), "utf8");
const cmsConstants = readFileSync(new URL("../src/cms/constants.ts", import.meta.url), "utf8");
const adminPanels = readFileSync(new URL("../src/cms/adminPanels.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const routing = readFileSync(new URL("../src/lib/cms/routing.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../src/lib/cms/schema.ts", import.meta.url), "utf8");
const publicCatchAllRoute = readFileSync(new URL("../src/pages/[...slug].astro", import.meta.url), "utf8");

const richTextEditorSource = blockEditor.slice(
  blockEditor.indexOf("function RichTextEditor"),
  blockEditor.indexOf("function BlockManualFields"),
);

test("Field wrapper is not a label so Tiptap clicks keep focus", () => {
  const fieldSource = ui.slice(ui.indexOf("function Field"), ui.indexOf("export const TextInput"));

  assert.match(fieldSource, /fieldChromeClass/);
  assert.doesNotMatch(fieldSource, /<label/);
});

test("Tiptap heading buttons set H2-H5 explicitly instead of toggling headings off", () => {
  assert.match(richTextEditorSource, /setHeading\(2\)/);
  assert.match(richTextEditorSource, /setHeading\(3\)/);
  assert.match(richTextEditorSource, /setHeading\(4\)/);
  assert.match(richTextEditorSource, /setHeading\(5\)/);
  assert.doesNotMatch(richTextEditorSource, /toggleHeading/);
});

test("Tiptap toolbar buttons preserve the editor selection", () => {
  const toolbarButtonCount = (richTextEditorSource.match(/<button type="button"/g) ?? []).length;
  const preserveSelectionCount = (richTextEditorSource.match(/onMouseDown=\{keepEditorSelection\}/g) ?? []).length;

  assert.ok(toolbarButtonCount > 0);
  assert.equal(preserveSelectionCount, toolbarButtonCount);
});

test("Saving or publishing never changes the selected content", () => {
  const saveDraftSource = cmsController.slice(
    cmsController.indexOf("const saveDraft = async"),
    cmsController.indexOf("const publishSnapshot = async"),
  );
  const publishSource = cmsController.slice(
    cmsController.indexOf("const publishSnapshot = async"),
    cmsController.indexOf("const applyBlocksJson"),
  );

  assert.doesNotMatch(saveDraftSource, /setSelection/);
  assert.doesNotMatch(publishSource, /setSelection/);
  assert.doesNotMatch(publishSource, /reconcileSelection/);
});

test("CMS restores selected content after dev-server reloads", () => {
  const loadContentSource = cmsController.slice(
    cmsController.indexOf("const loadContent = async"),
    cmsController.indexOf("useEffect(() => {"),
  );

  assert.match(storageState, /selectedContentStorageKey/);
  assert.match(storageState, /export const readStoredSelection/);
  assert.match(storageState, /export const writeStoredSelection/);
  assert.match(loadContentSource, /const storedSelection = readStoredSelection\(\)/);
  assert.match(loadContentSource, /current \?\? storedSelection/);
  assert.match(cmsController, /if \(selection\) writeStoredSelection\(selection\)/);
});

test("CMS restores the active section after refresh", () => {
  const controllerStateSource = cmsController.slice(
    cmsController.indexOf("export function useCmsController"),
    cmsController.indexOf("const selectedItem ="),
  );

  assert.match(storageState, /activeTabStorageKey/);
  assert.match(storageState, /export const readUrlTab/);
  assert.match(storageState, /export const readStoredTab/);
  assert.match(storageState, /export const readInitialTab/);
  assert.match(storageState, /export const writeUrlTab/);
  assert.match(controllerStateSource, /useState<CmsTab>\(\(\) => readInitialTab\(\)\)/);
  assert.match(cmsController, /writeStoredTab\(activeTab\)/);
  assert.match(cmsController, /writeUrlTab\(activeTab\)/);
});

test("Collections and categories share one top-level Content management section", () => {
  assert.match(cmsTypes, /"content"/);
  assert.doesNotMatch(cmsTypes, /"structure"/);
  assert.doesNotMatch(cmsTypes, /"collections" \| "categories"/);
  assert.match(cmsConstants, /id: "content", label: "Content"/);
  assert.doesNotMatch(cmsConstants, /id: "structure"/);
  assert.doesNotMatch(cmsConstants, /id: "collections"/);
  assert.doesNotMatch(cmsConstants, /id: "categories"/);
  assert.match(storageState, /value === "collections" \|\| value === "categories" \|\| value === "structure"\) return "content"/);
  assert.match(app, /contentView, setContentView\] = useState<"pages" \| "models" \| "shared" \| "media">\("pages"\)/);
  assert.match(app, /<PageDirectory/);
  assert.match(app, /<SharedBlockDirectory/);
  assert.match(app, /<MediaLibraryPanel/);
  assert.match(adminPanels, /export function PageDirectory/);
  assert.match(adminPanels, /Pages and entries/);
});

test("Duplicate old Overview and Navigation tabs are removed from top-level CMS navigation", () => {
  assert.doesNotMatch(cmsTypes, /"overview"/);
  assert.doesNotMatch(cmsTypes, /"navigation"/);
  assert.doesNotMatch(cmsConstants, /id: "overview", label: "Overview"/);
  assert.doesNotMatch(cmsConstants, /id: "navigation", label: "Navigation"/);
  assert.match(storageState, /value === "overview" \|\| value === "navigation"\) return "editor"/);
});

test("New content is created only after required setup modal validation", () => {
  const visualEditorSource = visualEditor.slice(
    visualEditor.indexOf("function VisualPageEditor"),
  );
  const submitSource = visualEditor.slice(
    visualEditor.indexOf("const handleCreateSubmit"),
    visualEditor.indexOf("return (", visualEditor.indexOf("const handleCreateSubmit")),
  );

  assert.match(cmsTypes, /type CreateContentDraft/);
  assert.match(visualEditorSource, /const \[createDraft, setCreateDraft\]/);
  assert.match(visualEditorSource, /const createFieldErrors: Record<string, string>/);
  assert.match(visualEditorSource, /Use a different title\. A page with this title already exists under this parent/);
  assert.match(visualEditorSource, /Use a different slug\. A page with this slug already exists under this parent/);
  assert.match(visualEditorSource, /Enter an SEO description/);
  assert.match(submitSource, /if \(createErrors\.length > 0\) return/);
  assert.match(submitSource, /onCreatePage\(input\)/);
  assert.match(submitSource, /onCreateEntry\(createDefinition, input\)/);
  assert.doesNotMatch(visualEditorSource, /setPageSetupOpen/);
});

test("Create content fields expose required and invalid states inline", () => {
  const createFieldSource = blockEditor.slice(
    blockEditor.indexOf("function CreateModalField"),
    blockEditor.indexOf("function FieldValueInput"),
  );
  const visualEditorSource = visualEditor.slice(
    visualEditor.indexOf("function VisualPageEditor"),
  );

  assert.match(createFieldSource, /Required/);
  assert.match(createFieldSource, /htmlFor=\{id\}/);
  assert.match(createFieldSource, /id=\{`\$\{id\}-error`\}/);
  assert.match(visualEditorSource, /aria-invalid=\{titleField\.invalid \|\| undefined\}/);
  assert.match(visualEditorSource, /aria-describedby=\{seoDescriptionField\.describedBy\}/);
  assert.match(visualEditorSource, /noValidate/);
});

test("Public catch-all resolves newly published routes dynamically in dev", () => {
  assert.match(publicCatchAllRoute, /export const prerender = import\.meta\.env\.PROD/);
  assert.match(publicCatchAllRoute, /const resolvePublishedRoute/);
  assert.match(publicCatchAllRoute, /Astro\.params\.slug/);
  assert.match(publicCatchAllRoute, /resolvePublishedRoute\(await getPublishedContent\(\)/);
});

test("Collection index pages are first-class public routes", () => {
  assert.match(schema, /publicIndex: z\.boolean\(\)\.default\(false\)/);
  assert.match(schema, /targetType: z\.enum\(\["page", "entry", "collection", "category", "url"\]\)/);
  assert.match(routing, /export const getCollectionPath/);
  assert.match(routing, /export const getPublicCollections/);
  assert.match(routing, /type: "collection" as const/);
  assert.match(publicCatchAllRoute, /getPublicCollections\(graph\)/);
  assert.match(publicCatchAllRoute, /routeType: "collection"/);
  assert.match(publicCatchAllRoute, /getCollectionEntries\(subject, graph\)/);
  assert.match(adminPanels, /Build collection index page/);
  assert.match(adminPanels, /targetType === "collection"/);
});
