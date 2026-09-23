import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { spacerHeights, normalizeSpacerHeight } from "../src/content/spacer";
import { normalizeLinkHref } from "../src/content/linkHref";
import { spacerBlock } from "../src/blocks/spacer/definition";
import { SpacerView } from "../src/blocks/spacer/View";
import { StructuredTextRenderer } from "../src/blocks/text/View";

test("both Spacer insertion forms share a bounded height contract", () => {
  for (const height of spacerHeights) {
    assert.equal(normalizeSpacerHeight(String(height)), height);
    assert.equal(spacerBlock.schema.parse({ height: String(height) }).height, height);
    const section = renderToStaticMarkup(createElement(SpacerView, { content: { height } }));
    const text = renderToStaticMarkup(createElement(StructuredTextRenderer, {
      nodes: { type: "doc", content: [{ type: "spacer", attrs: { height } }] },
    }));
    assert.ok(text.includes(section));
    assert.ok(section.includes(`data-content-spacer="${height}"`));
    assert.ok(section.includes('aria-hidden="true"'));
  }
  assert.equal(spacerBlock.schema.parse({}).height, 16);
  for (const invalid of [-4, 0, 24, Infinity, null, {}, "100vh", "calc(1px)"]) {
    assert.equal(normalizeSpacerHeight(invalid), 16);
    assert.equal(spacerBlock.schema.safeParse({ height: invalid }).success, false);
  }
});

test("link editor and public renderer use the same safe URL policy", () => {
  for (const safe of ["https://example.com/", "http://example.com/", "/blog/lesson", "#lesson", "mailto:test@example.com", "tel:+441234567890"]) {
    assert.equal(normalizeLinkHref(safe), safe);
  }
  assert.equal(normalizeLinkHref("//example.com/lesson"), "https://example.com/lesson");
  assert.equal(normalizeLinkHref("https://example.com/my lesson"), "https://example.com/my%20lesson");
  for (const unsafe of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\nscript:alert(1)", "data:text/html,test", "/\\evil.example", "", "not a link"]) {
    assert.equal(normalizeLinkHref(unsafe), null);
  }
});
