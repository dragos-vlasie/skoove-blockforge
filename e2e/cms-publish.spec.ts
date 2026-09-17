import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = path.join(projectRoot, "content");
let contentBackupPath = "";

const restoreContent = () => {
  if (!contentBackupPath) return;
  rmSync(contentPath, { recursive: true, force: true });
  cpSync(contentBackupPath, contentPath, { recursive: true });
};

const gotoAfterContentWrite = async (page: any, url: string) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      if (!String(error).includes("ERR_ABORTED") || attempt === 2) throw error;
      await page.waitForTimeout(500);
    }
  }
};

const login = async (page: any) => {
  await page.goto("/cms");
  await page.getByLabel("Admin Password").fill("test-password");
  await page.getByRole("button", { name: "Unlock CMS" }).click();
  await expect(page).toHaveURL(/\/cms$/);
  await expect(page.getByText("Currently editing")).toBeVisible();
};

test.describe("CMS publish flow", () => {
  test.beforeAll(() => {
    contentBackupPath = mkdtempSync(path.join(tmpdir(), "blockforge-cms-content-"));
    cpSync(contentPath, contentBackupPath, { recursive: true });
  });

  test.afterEach(() => {
    restoreContent();
  });

  test.afterAll(() => {
    restoreContent();
    rmSync(contentBackupPath, { recursive: true, force: true });
  });

  test("creating and publishing a new page keeps the editor on that page and adds it to the public menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "stateful publish test runs once");

    const stamp = Date.now();
    const title = `E2E Publish Page ${stamp}`;
    const slug = `e2e-publish-page-${stamp}`;

    await login(page);

    await page.getByTestId("create-content-open").click();
    await expect(page.getByTestId("create-content-modal")).toBeVisible();
    await page.getByTestId("create-title").fill(title);
    await page.getByTestId("create-slug").fill(slug);
    await page.getByTestId("create-seo-title").fill(title);
    await page.getByTestId("create-seo-description").fill(
      "A Playwright-created page used to verify publishing keeps selection and updates public navigation.",
    );
    await page.getByTestId("create-submit").click();

    await expect(page.getByTestId("create-content-modal")).toBeHidden();
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText(`${slug}.json`)).toBeVisible();

    await page.getByTestId("panel-tab-technical").click();
    await page.getByTestId("content-status").selectOption("published");

    await page.getByTestId("global-navigation-header").click();
    await page.getByTestId("navigation-add-header-menu").click();
    await page.getByTestId("navigation-add-top-level-link").last().click();
    await page.getByTestId("navigation-item-label").last().fill(title);
    await page.getByTestId("navigation-item-target-type").last().selectOption("page");
    await page.getByTestId("navigation-item-target").last().selectOption({ label: title });

    const publishButton = page.getByTestId("publish-content");
    await expect(publishButton).toHaveText("Publish");
    await expect(publishButton).toBeEnabled();

    const publishResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/cms/publish") && response.request().method() === "POST",
    );
    await publishButton.click();

    const publishResponse = await publishResponsePromise;

    expect(publishResponse.ok()).toBe(true);
    await expect(page).toHaveURL(/\/cms$/);
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText(`${slug}.json`)).toBeVisible();

    await gotoAfterContentWrite(page, "/");
    const headerNav = page.getByRole("navigation", { name: "Main navigation" });
    const newMenuItem = headerNav.getByRole("link", { name: title });
    const publicPath = `/${slug}/`;
    await expect(newMenuItem).toHaveAttribute("href", publicPath);

    await gotoAfterContentWrite(page, publicPath);
    await expect(page).toHaveURL(new RegExp(`${publicPath}$`));
    await expect(page).toHaveTitle(new RegExp(title));
  });
});
