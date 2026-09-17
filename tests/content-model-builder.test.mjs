import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const appSource = readSource("../App.tsx");
const adminPanelsSource = readSource("../src/cms/adminPanels.tsx");
const contentPanelsSource = readSource("../src/cms/contentPanels.tsx");
const routingSource = readSource("../src/lib/cms/routing.ts");
const validationSource = readSource("../src/lib/cms/validation.ts");

test("content tab exposes the full content model surface", () => {
  assert.match(appSource, /pages", "Pages"/);
  assert.match(appSource, /models", "Models"/);
  assert.match(appSource, /shared", "Shared blocks"/);
  assert.match(appSource, /media", "Media"/);
});

test("collection builder explains model, routes, index pages, fields, and categories", () => {
  assert.match(adminPanelsSource, /Content model builder/);
  assert.match(adminPanelsSource, /1\. Model/);
  assert.match(adminPanelsSource, /2\. Route and index/);
  assert.match(adminPanelsSource, /3\. Index page SEO/);
  assert.match(adminPanelsSource, /4\. Entry fields/);
  assert.match(adminPanelsSource, /5\. Category behavior/);
  assert.match(adminPanelsSource, /Entry route:/);
  assert.match(adminPanelsSource, /Index page:/);
  assert.match(adminPanelsSource, /Stable key/);
});

test("collection setup exposes safe readiness checks", () => {
  assert.match(adminPanelsSource, /isModelReady/);
  assert.match(adminPanelsSource, /isRouteReady/);
  assert.match(adminPanelsSource, /isIndexSeoReady/);
  assert.match(adminPanelsSource, /modelSafetyMessages/);
  assert.match(adminPanelsSource, /reservedRouteSegments/);
  assert.match(adminPanelsSource, /Needs setup/);
  assert.match(adminPanelsSource, /Required/);
  assert.match(adminPanelsSource, /Ready/);
});

test("category behavior is scoped to the selected collection", () => {
  assert.match(adminPanelsSource, /isCategoryEnabled/);
  assert.match(adminPanelsSource, /Locked to another collection/);
  assert.match(adminPanelsSource, /availableCategoryCount/);
  assert.match(contentPanelsSource, /availableCategories/);
  assert.match(contentPanelsSource, /category\.collectionIds\.length === 0/);
  assert.match(contentPanelsSource, /category\.collectionIds\.includes\(definition\.id\)/);
});

test("public collection and category routes remain backed by shared routing helpers", () => {
  assert.match(adminPanelsSource, /getCollectionPath/);
  assert.match(adminPanelsSource, /getEntryPath/);
  assert.match(adminPanelsSource, /getCategoryPath/);
  assert.match(routingSource, /getCollectionPath/);
  assert.match(routingSource, /getCategoryEntries/);
  assert.match(validationSource, /getCollectionEntries/);
  assert.match(validationSource, /public index page but no published entries/);
});
