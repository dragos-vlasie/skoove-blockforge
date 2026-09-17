import { expect, test } from "@playwright/test";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = path.join(projectRoot, "content");
const uploadsPath = path.join(projectRoot, "public", "uploads");
let contentBackupPath = "";
let uploadsBackupPath = "";
let hadUploads = false;

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

const removeStaleEntries = (sourceDir: string, destinationDir: string) => {
  if (!existsSync(sourceDir) || !existsSync(destinationDir)) return;

  for (const entry of readdirSync(destinationDir, { withFileTypes: true })) {
    const sourceEntry = path.join(sourceDir, entry.name);
    const destinationEntry = path.join(destinationDir, entry.name);

    if (!existsSync(sourceEntry)) {
      rmSync(destinationEntry, { recursive: true, force: true });
      continue;
    }

    if (entry.isDirectory()) removeStaleEntries(sourceEntry, destinationEntry);
  }
};

const restoreDirectory = (sourceDir: string, destinationDir: string) => {
  if (!existsSync(sourceDir)) {
    rmSync(destinationDir, { recursive: true, force: true });
    return;
  }

  cpSync(sourceDir, destinationDir, { recursive: true, force: true });
  removeStaleEntries(sourceDir, destinationDir);
};

const restoreFiles = () => {
  if (contentBackupPath) restoreDirectory(contentBackupPath, contentPath);

  if (hadUploads && uploadsBackupPath) restoreDirectory(uploadsBackupPath, uploadsPath);
  if (!hadUploads) rmSync(uploadsPath, { recursive: true, force: true });
};

const login = async (page: any) => {
  await page.goto("/cms");

  const passwordField = page.getByLabel("Admin Password");
  if (await passwordField.count()) {
    await passwordField.fill("test-password");
    await page.getByRole("button", { name: "Unlock CMS" }).click();
  }

  await expect(page).toHaveURL(/\/cms$/);
  await expect(page.getByText("Creative Suite")).toBeVisible();
};

const openContentTab = async (page: any) => {
  await page.goto("/cms?tab=content");
  await expect(page).toHaveURL(/\/cms\?tab=content$/);
  await expect(page.getByText("Content library")).toBeVisible();
};

test.describe("CMS media and content model builder", () => {
  test.beforeAll(() => {
    contentBackupPath = path.join(mkdtempSync(path.join(tmpdir(), "blockforge-cms-content-")), "content");
    uploadsBackupPath = path.join(mkdtempSync(path.join(tmpdir(), "blockforge-cms-uploads-")), "uploads");
    hadUploads = existsSync(uploadsPath);
    cpSync(contentPath, contentBackupPath, { recursive: true });
    if (hadUploads) cpSync(uploadsPath, uploadsBackupPath, { recursive: true });
  });

  test.afterEach(() => {
    restoreFiles();
  });

  test.afterAll(() => {
    restoreFiles();
    rmSync(path.dirname(contentBackupPath), { recursive: true, force: true });
    rmSync(path.dirname(uploadsBackupPath), { recursive: true, force: true });
  });

  test("collection builder shows safe route, index, field, and category guidance", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "builder UI is covered once");

    await login(page);
    await openContentTab(page);
    await page.getByTestId("content-view-models").click();
    await page.getByTestId("collection-edit-collection-articles").click();

    const builder = page.getByTestId("collection-builder-modal");
    await expect(builder).toBeVisible();
    await expect(builder.getByText("Content model builder")).toBeVisible();
    await expect(builder.getByText("1. Model")).toBeVisible();
    await expect(builder.getByText("2. Route and index")).toBeVisible();
    await expect(builder.getByText("3. Index page SEO")).toBeVisible();
    await expect(builder.getByText("4. Entry fields")).toBeVisible();
    await expect(builder.getByText("5. Category behavior")).toBeVisible();
    await expect(builder.getByText("Entry route:")).toBeVisible();
    await expect(builder.getByText("Index page:")).toBeVisible();
  });

  test("media library uploads metadata and validates the uploaded URL", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "stateful upload test runs once");

    await login(page);
    await openContentTab(page);
    await page.getByTestId("content-view-media").click();
    await expect(page.getByRole("heading", { name: "Media library" })).toBeVisible();

    await page.locator('input[type="file"]').first().setInputFiles({
      name: "cms-test.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await page.getByPlaceholder("Alt text").first().fill("Tiny CMS test image");
    await page.getByPlaceholder("Folder").first().fill("tests");
    await page.getByPlaceholder("Tags").first().fill("smoke, media");

    const uploadResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/cms/media/upload") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Upload" }).click();
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.ok()).toBe(true);

    const uploadPayload = await uploadResponse.json();
    expect(uploadPayload.asset.url).toMatch(/^\/uploads\/\d{4}\/cms-test-/);
    expect(uploadPayload.asset.alt).toBe("Tiny CMS test image");
    expect(uploadPayload.asset.folder).toBe("tests");
    expect(uploadPayload.asset.tags).toEqual(["smoke", "media"]);
    await expect(page.getByText(uploadPayload.asset.filename, { exact: true }).first()).toBeVisible();

    const checkResponse = await page.request.post("/api/cms/media/check", {
      data: { graph: uploadPayload.graph, urls: [uploadPayload.asset.url] },
    });
    expect(checkResponse.ok()).toBe(true);
    const checkPayload = await checkResponse.json();
    expect(checkPayload.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: uploadPayload.asset.url,
          ok: true,
          status: 200,
        }),
      ]),
    );
  });
});
