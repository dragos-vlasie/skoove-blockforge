import { expect, test } from "@playwright/test";

test.describe("CMS auth", () => {
  test("protects the CMS and rejects bad password", async ({ page }) => {
    await page.goto("/cms");
    await expect(page).toHaveURL(/\/cms$/);
    await expect(page.getByRole("heading", { name: "BlockForge CMS" })).toBeVisible();

    await page.getByLabel("Admin Password").fill("wrong-password");
    await page.getByRole("button", { name: "Unlock CMS" }).click();

    await expect(page).toHaveURL(/\/cms\?error=invalid$/);
    await expect(page.getByText("Password is incorrect.")).toBeVisible();
  });

  test("logs in and loads the editor shell", async ({ page }) => {
    await page.goto("/cms");
    await page.getByLabel("Admin Password").fill("test-password");
    await page.getByRole("button", { name: "Unlock CMS" }).click();

    await expect(page).toHaveURL(/\/cms$/);
    await expect(page.getByText("Creative Suite")).toBeVisible();
    await expect(page.getByText("Currently editing")).toBeVisible();
    await expect(page.getByRole("button", { name: /Open Public/i })).toBeVisible();
  });

  test("keeps the active CMS section after refresh", async ({ page }, testInfo) => {
    await page.goto("/cms");
    await page.getByLabel("Admin Password").fill("test-password");
    await page.getByRole("button", { name: "Unlock CMS" }).click();

    if (testInfo.project.name === "mobile") {
      await page.goto("/cms?tab=settings");
    } else {
      await page.getByTestId("rail-settings").click();
    }
    await expect(page).toHaveURL(/\/cms\?tab=settings$/);
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/cms\?tab=settings$/);
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByText("Site SEO settings")).toBeVisible();
  });

  test("old login URL redirects to the CMS root login", async ({ page }) => {
    await page.goto("/cms/login");
    await expect(page).toHaveURL(/\/cms$/);
    await expect(page.getByRole("heading", { name: "BlockForge CMS" })).toBeVisible();
  });
});
