import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { access } from "node:fs/promises";
import net from "node:net";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const distRoot = fileURLToPath(new URL("../dist/", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const runCommand = (args, { timeoutMs = 120_000 } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        CMS_CONTENT_STORE: "local",
        CMS_ADMIN_PASSWORD: "test-password",
        CMS_SESSION_SECRET: "test-session-secret-for-smoke-tests",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${npmCommand} ${args.join(" ")} timed out.\n${output}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(output);
        return;
      }
      reject(new Error(`${npmCommand} ${args.join(" ")} exited with ${code}.\n${output}`));
    });
  });

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });

const startPreviewServer = async (port) => {
  const contentTypes = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".txt": "text/plain",
    ".xml": "application/xml",
  };
  const resolveRequestFile = (requestUrl) => {
    const pathname = new URL(requestUrl, "http://127.0.0.1").pathname;
    const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
    const candidate = join(distRoot, safePath);

    if (pathname.endsWith("/")) return join(candidate, "index.html");
    if (extname(candidate)) return candidate;
    return join(candidate, "index.html");
  };
  const server = createServer((request, response) => {
    const filePath = resolveRequestFile(request.url ?? "/");
    if (!filePath.startsWith(distRoot) || !existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream" });
    response.end(readFileSync(filePath));
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return { baseUrl, server };
};

const stopPreviewServer = (server) => {
  server?.close();
};

const expectOk = async (baseUrl, path) => {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const body = await response.text();
  assert.equal(response.status, 200, `${path} should return 200.\n${body.slice(0, 300)}`);
  return body;
};

test("published website builds and serves working public routes", { timeout: 180_000 }, async (t) => {
  await runCommand(["run", "build"]);

  await Promise.all([
    access(new URL("../dist/index.html", import.meta.url)),
    access(new URL("../dist/about/index.html", import.meta.url)),
    access(new URL("../dist/articles/static-first-cms/index.html", import.meta.url)),
    access(new URL("../dist/category/guides/index.html", import.meta.url)),
    access(new URL("../dist/sitemap.xml", import.meta.url)),
    access(new URL("../dist/robots.txt", import.meta.url)),
  ]);

  const port = await getFreePort();
  const preview = await startPreviewServer(port);
  t.after(() => stopPreviewServer(preview.server));

  const home = await expectOk(preview.baseUrl, "/");
  assert.match(home, /Instant websites from structured content/);
  assert.match(home, /<meta name="description" content="Build instant websites from structured CMS content/);
  assert.match(home, /<script type="application\/ld\+json">/);
  assert.match(home, /"@type":"WebPage"/);
  assert.doesNotMatch(home, /_astro\/App\.[^"]+\.js/, "Public pages should not ship the CMS React app.");

  const about = await expectOk(preview.baseUrl, "/about/");
  assert.match(about, /About BlockForge/);
  assert.match(about, /A CMS that does not slow the website down/);

  const article = await expectOk(preview.baseUrl, "/articles/static-first-cms/");
  assert.match(article, /How static-first CMS publishing works/);
  assert.match(article, /property="article:published_time"/);
  assert.match(article, /"@type":"Article"/);

  const category = await expectOk(preview.baseUrl, "/category/guides/");
  assert.match(category, /Category/);
  assert.match(category, /How static-first CMS publishing works/);
  assert.match(category, /"@type":"CollectionPage"/);

  const sitemap = await expectOk(preview.baseUrl, "/sitemap.xml");
  assert.match(sitemap, /<loc>http:\/\/127\.0\.0\.1(?::\d+)?\/<\/loc>/);
  assert.match(sitemap, /<loc>http:\/\/127\.0\.0\.1(?::\d+)?\/about\/<\/loc>/);
  assert.match(sitemap, /<loc>http:\/\/127\.0\.0\.1(?::\d+)?\/articles\/static-first-cms\/<\/loc>/);

  const robots = await expectOk(preview.baseUrl, "/robots.txt");
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Sitemap: http:\/\/127\.0\.0\.1(?::\d+)?\/sitemap\.xml/);

  const missing = await fetch(`${preview.baseUrl}/this-route-should-not-exist/`, { redirect: "manual" });
  assert.equal(missing.status, 404);
});

test("built public HTML contains no CMS app bundle", () => {
  const homeHtml = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(homeHtml, /_astro\/App\.[^"]+\.js/);
  assert.match(homeHtml, /<link rel="stylesheet" href="\/_astro\/BlockRenderer\./);
});

test("built public hero links keep their block utility colors", () => {
  const homeHtml = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  const stylesheetHref = homeHtml.match(/<link rel="stylesheet" href="([^"]*BlockRenderer[^"]+\.css)">/)?.[1];
  assert.ok(stylesheetHref, "Expected the public block stylesheet to be linked.");

  const publicCss = readFileSync(join(distRoot, stylesheetHref.replace(/^\/+/, "")), "utf8");
  const primaryCtaClass = homeHtml.match(/<a href="#content" class="([^"]+)">Read the guide<\/a>/)?.[1] ?? "";
  const secondaryCtaClass = homeHtml.match(/<a href="#content" class="([^"]+)">Learn More<\/a>/)?.[1] ?? "";

  assert.match(publicCss, /a:not\(\[class\]\)\{color:inherit\}/);
  assert.match(primaryCtaClass, /\bbg-violet-600\b/);
  assert.match(primaryCtaClass, /\btext-white\b/);
  assert.match(secondaryCtaClass, /\btext-white\b/);
});
