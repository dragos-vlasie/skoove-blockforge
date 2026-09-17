import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { test } from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const blockDirUrl = new URL("../src/blocks/", import.meta.url);

const typesSource = readSource("../types.ts");
const registrySource = readSource("../src/blocks/registry.ts");
const appSource = readSource("../App.tsx");
const visualEditorSource = readSource("../src/cms/VisualPageEditor.tsx");
const adminPanelsSource = readSource("../src/cms/adminPanels.tsx");
const contentUtilsSource = readSource("../src/cms/contentUtils.ts");
const cmsControllerSource = readSource("../src/cms/useCmsController.ts");
const schemaSource = readSource("../src/lib/cms/schema.ts");
const previewRendererSource = readSource("../components/BlockLibrary.tsx");
const publicRendererSource = readSource("../src/website/BlockRenderer.astro");
const cmsEditorSource = `${appSource}\n${visualEditorSource}\n${adminPanelsSource}\n${contentUtilsSource}\n${cmsControllerSource}`;

const blockTypeNames = Array.from(
  typesSource.matchAll(/^\s+([A-Z_]+)\s+=\s+"[^"]+",/gm),
  (match) => match[1],
);

const blockFolders = readdirSync(blockDirUrl)
  .filter((name) => statSync(new URL(name, blockDirUrl)).isDirectory())
  .filter((name) => existsSync(new URL(`${name}/definition.ts`, blockDirUrl)))
  .map((name) => ({
    name,
    definitionUrl: new URL(`${name}/definition.ts`, blockDirUrl),
    previewUrl: new URL(`${name}/Preview.tsx`, blockDirUrl),
    publicUrl: new URL(`${name}/Public.astro`, blockDirUrl),
    viewUrl: new URL(`${name}/View.tsx`, blockDirUrl),
  }));

const interactivePublicBlockFolders = new Set(["faq", "rental-features"]);
const rentalBlockFolders = [
  ["rental-hero", "RENTAL_HERO"],
  ["rental-about", "RENTAL_ABOUT"],
  ["rental-features", "RENTAL_FEATURES"],
  ["rental-problem", "RENTAL_PROBLEM"],
  ["rental-cta", "RENTAL_CTA"],
  ["rental-image-text", "RENTAL_IMAGE_TEXT"],
];

test("block registry declares every BlockType enum member", () => {
  assert.ok(blockTypeNames.length > 0);

  for (const typeName of blockTypeNames) {
    const hasDefinition = blockFolders.some(({ definitionUrl }) =>
      readFileSync(definitionUrl, "utf8").includes(`BlockType.${typeName}`),
    );
    assert.ok(hasDefinition, `Missing block definition for ${typeName}`);
  }
});

test("each block folder has a definition, shared view, React preview, and Astro public renderer", () => {
  assert.ok(blockFolders.length > 0);

  for (const typeName of blockTypeNames) {
    const folder = blockFolders.find(({ definitionUrl }) =>
      readFileSync(definitionUrl, "utf8").includes(`BlockType.${typeName}`),
    );

    assert.ok(folder, `Missing block folder definition for ${typeName}`);
    assert.ok(existsSync(folder.viewUrl), `Missing View.tsx for ${folder.name}`);
    assert.ok(existsSync(folder.previewUrl), `Missing Preview.tsx for ${folder.name}`);
    assert.ok(existsSync(folder.publicUrl), `Missing Public.astro for ${folder.name}`);
  }
});

test("block preview and public wrappers render the shared view", () => {
  for (const folder of blockFolders) {
    assert.match(readFileSync(folder.previewUrl, "utf8"), /from "\.\/View"/, `${folder.name}/Preview.tsx must import ./View`);
    assert.match(readFileSync(folder.publicUrl, "utf8"), /from "\.\/View"/, `${folder.name}/Public.astro must import ./View`);
  }
});

test("registry and dispatchers discover block folders instead of hard-coding block maps", () => {
  assert.match(registrySource, /import\.meta\.glob\("\.\/\*\/definition\.ts"/);
  assert.match(previewRendererSource, /import\.meta\.glob\("\.\.\/src\/blocks\/\*\/Preview\.tsx"/);
  assert.match(publicRendererSource, /import\.meta\.glob\("\.\.\/blocks\/\*\/Public\.astro"/);
  assert.match(previewRendererSource, /blockFoldersByType/);
  assert.match(publicRendererSource, /blockFoldersByType/);
});

test("CMS editor and graph schema consume the registry instead of local block maps", () => {
  assert.match(cmsEditorSource, /blockDefinitions\.map/);
  assert.match(cmsEditorSource, /cloneDefaultBlockContent/);
  assert.doesNotMatch(cmsEditorSource, /Object\.values\(BlockType\)/);
  const explicitBlockTypeChecks = [
    ...cmsEditorSource.matchAll(/block\.type === BlockType\.([A-Z_]+)/g),
  ].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(explicitBlockTypeChecks)].sort(),
    ["SHARED_BLOCK", "TWO_COLUMN"],
    "Only structural block wrappers should need explicit CMS branching.",
  );

  assert.match(schemaSource, /blockDefinitions\.map/);
  assert.doesNotMatch(schemaSource, /z\.literal\(BlockType\./);
});

test("public block wrappers do not hydrate React by default", () => {
  for (const folder of blockFolders) {
    const source = readFileSync(folder.publicUrl, "utf8");

    if (interactivePublicBlockFolders.has(folder.name)) {
      assert.match(source, /client:[a-zA-Z-]+/, `${folder.name}/Public.astro should explicitly hydrate because it is interactive`);
    } else {
      assert.doesNotMatch(source, /client:[a-zA-Z-]+/, `${folder.name}/Public.astro must not use client:* hydration by default`);
    }
  }
});

test("shared block views stay stateless unless the public block is explicitly interactive", () => {
  const statefulHookPattern = /\b(useState|useReducer|useEffect|useLayoutEffect|useRef|useMemo|useCallback)\b/;

  for (const folder of blockFolders) {
    const source = readFileSync(folder.viewUrl, "utf8");

    if (interactivePublicBlockFolders.has(folder.name)) {
      assert.match(source, statefulHookPattern, `${folder.name}/View.tsx should contain the interaction state it hydrates for`);
    } else {
      assert.doesNotMatch(source, statefulHookPattern, `${folder.name}/View.tsx should stay stateless; move CMS-only state into Preview.tsx`);
    }
  }
});

test("rental marketing blocks keep the CMS block folder contract", () => {
  assert.match(typesSource, /RENTAL_HERO/);
  assert.match(typesSource, /RENTAL_ABOUT/);
  assert.match(typesSource, /RENTAL_FEATURES/);
  assert.match(typesSource, /RENTAL_PROBLEM/);
  assert.match(typesSource, /RENTAL_CTA/);
  assert.match(typesSource, /RENTAL_IMAGE_TEXT/);
  assert.match(readSource("../src/blocks/types.ts"), /category\?: string/);

  for (const [folderName, typeName] of rentalBlockFolders) {
    const folder = blockFolders.find((candidate) => candidate.name === folderName);
    assert.ok(folder, `Missing ${folderName} block folder`);

    const definition = readFileSync(folder.definitionUrl, "utf8");
    const view = readFileSync(folder.viewUrl, "utf8");
    const preview = readFileSync(folder.previewUrl, "utf8");
    const publicRenderer = readFileSync(folder.publicUrl, "utf8");

    assert.match(definition, new RegExp(`BlockType\\.${typeName}`));
    assert.match(definition, /category: "Rental car"/);
    assert.match(definition, /defaultContent:/);
    assert.match(definition, /schema: z/);
    assert.match(definition, /fields:/);
    assert.match(preview, /from "\.\/View"/);
    assert.match(publicRenderer, /from "\.\/View"/);
    assert.doesNotMatch(view, /next\/(image|link|navigation)/);
    assert.doesNotMatch(view, /react-datepicker|markdown-to-jsx/);
  }
});

test("component library groups blocks by definition category", () => {
  assert.match(visualEditorSource, /componentLibraryGroups/);
  assert.match(visualEditorSource, /definition\.category \|\| "General"/);
  assert.match(visualEditorSource, /group\.category/);
});
