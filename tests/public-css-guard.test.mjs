import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const publicCss = readFileSync(new URL("../src/styles/public.css", import.meta.url), "utf8");

const splitSelectorList = (selectorList) => {
  const selectors = [];
  let depth = 0;
  let current = "";

  for (const character of selectorList) {
    if (character === "(" || character === "[") depth += 1;
    if (character === ")" || character === "]") depth -= 1;

    if (character === "," && depth === 0) {
      selectors.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) selectors.push(current.trim());
  return selectors;
};

const collectSelectors = (css) => {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [];
  let cursor = 0;

  while (cursor < source.length) {
    const openBrace = source.indexOf("{", cursor);
    if (openBrace === -1) break;

    const previousCloseBrace = source.lastIndexOf("}", openBrace);
    const prelude = source.slice(previousCloseBrace + 1, openBrace).trim();
    if (prelude && !prelude.startsWith("@")) selectors.push(...splitSelectorList(prelude));

    cursor = openBrace + 1;
  }

  return selectors;
};

test("public CSS does not use global element selectors that override block utility classes", () => {
  const dangerousElements = /^(a|button|h[1-6]|p)(?=$|[:.#\[])/;
  const allowedSelectors = new Set(["a:not([class])"]);
  const unsafeSelectors = collectSelectors(publicCss).filter(
    (selector) => dangerousElements.test(selector) && !allowedSelectors.has(selector),
  );

  assert.deepEqual(
    unsafeSelectors,
    [],
    `Scope public CSS selectors instead of targeting raw elements: ${unsafeSelectors.join(", ")}`,
  );
});

test("public link reset only targets unclassed links", () => {
  assert.match(publicCss, /a:not\(\[class\]\)\s*\{\s*color:\s*inherit;/);
  assert.doesNotMatch(publicCss, /(^|})\s*a\s*\{\s*color:\s*inherit;/);
});

test("public CSS remains a small global foundation", () => {
  const lineCount = publicCss.split(/\r?\n/).length;
  const componentSelector = /\.(?:core|template|publication|travel|rental|site-(?:section|container|card|button|field|media))[-_a-zA-Z0-9]*/;

  assert.ok(lineCount <= 160, `Move component styling to Tailwind utilities; public.css has ${lineCount} lines`);
  assert.doesNotMatch(publicCss, componentSelector);
});
