import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

test("Skoove adapter connects the installed v4 package to host messages", async () => {
  const require = createRequire(import.meta.url);
  const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
  const bundle = await esbuild.build({
    stdin: { contents: 'import { createRoot } from "react-dom/client"; import { LivePreviewClient } from "./src/next/LivePreviewClient"; createRoot(document.getElementById("root")).render(<LivePreviewClient parentOrigin={location.origin} />);', resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, format: "iife", jsx: "automatic",
    plugins: [{ name: "isolated-public-renderer", setup(build) {
      // Exercise the real adapter/package without fetching or editing site data.
      // The real Skoove renderer is covered by the production build.
      build.onResolve({ filter: /^\.\/PublicSite$/ }, () => ({ path: "public-fixture", namespace: "fixture" }));
      build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: 'export function PublicSite({route}) { window.contentRenderCount = (window.contentRenderCount || 0) + 1; return <main className="m-20"><section data-blockforge-block-id={route.subject.blocks[0].id} className="h-60 p-8"><div data-blockforge-block-id="nested">{route.subject.caption}</div></section></main>; }',
        loader: "tsx", resolveDir: process.cwd(),
      }));
    } }],
  });
  const css = await postcss([tailwind()]).process('@import "tailwindcss"; @source "./node_modules/@blockforge/preview/src";', { from: `${process.cwd()}/adapter-fixture.css` });
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "text/html");
    if (request.url === "/client") response.end(`<!doctype html><style>${css.css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`);
    else response.end('<!doctype html><script>window.previewMessages=[];addEventListener("message",e=>{if(e.source===document.querySelector("iframe").contentWindow)window.previewMessages.push(e.data)})</script><iframe title="Skoove preview" src="/client" width="1000" height="800"></iframe>');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/host`);
    await page.waitForFunction(() => window.previewMessages.some((message) => message.type === "blockforge:preview:ready"));
    const ready = await page.evaluate(() => window.previewMessages.find((message) => message.type === "blockforge:preview:ready"));
    assert.equal(ready.protocolVersion, 4);
    assert.deepEqual(ready.capabilities, ["subject-updates", "section-insertion", "section-actions"]);
    const frame = page.frameLocator('iframe[title="Skoove preview"]');
    const route = { graph: {}, subject: { id: "article", caption: "Original caption", blocks: [{ id: "table", type: "TABLE" }] }, routeType: "entry", path: "/blog/article/" };
    const send = (message) => page.evaluate((data) => document.querySelector("iframe").contentWindow.postMessage(data, location.origin), message);
    await send({ type: "blockforge:preview:render", route, activeBlockId: "table" });
    await frame.getByText("Original caption").waitFor();
    assert.equal(await frame.getByRole("toolbar").count(), 0, "new actions require host authorization");
    await send({ type: "blockforge:preview:render", route, activeBlockId: "table", capabilities: ["section-actions"] });
    await frame.getByRole("toolbar").waitFor();
    await frame.getByRole("button", { name: "Duplicate section" }).click();
    await page.waitForFunction(() => window.previewMessages.some((message) => message.type === "blockforge:preview:section-action"));
    const action = await page.evaluate(() => window.previewMessages.find((message) => message.type === "blockforge:preview:section-action"));
    assert.deepEqual(action, { type: "blockforge:preview:section-action", blockId: "table", action: "duplicate", subjectId: "article", path: "/blog/article/" });
    await send({ type: "blockforge:preview:update-subject", subject: { ...route.subject, caption: "Updated caption" } });
    await frame.getByText("Updated caption").waitFor();
    const iframe = page.frames().find((candidate) => candidate.url().endsWith("/client"));
    await iframe.evaluate(() => {
      const data = { type: "blockforge:preview:update-subject", subject: { id: "wrong", caption: "REJECT THIS", blocks: [] } };
      window.dispatchEvent(new MessageEvent("message", { origin: "https://wrong.example", source: parent, data }));
      window.dispatchEvent(new MessageEvent("message", { origin: location.origin, source: window, data }));
    });
    assert.equal(await frame.getByText("Updated caption").count(), 1);
    const renders = await iframe.evaluate(() => window.contentRenderCount);
    await send({ type: "blockforge:preview:set-active-block", activeBlockId: null });
    await frame.getByText("Updated caption").hover();
    await frame.getByText("Updated caption").click();
    await page.waitForFunction(() => window.previewMessages.some((message) => message.type === "blockforge:preview:select-block"));
    const selected = await page.evaluate(() => window.previewMessages.find((message) => message.type === "blockforge:preview:select-block"));
    assert.equal(selected.blockId, "table", "nested DOM selection resolves to owning section");
    assert.equal(await iframe.evaluate(() => window.contentRenderCount), renders);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
