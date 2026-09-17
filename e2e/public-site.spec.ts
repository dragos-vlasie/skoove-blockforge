import { expect, test } from "@playwright/test";

const expectJsonLdType = async (page: any, type: string) => {
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLd).toContain(`"@type":"${type}"`);
};

test.describe("public website", () => {
  test("public home is accessible without CMS auth", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle("BlockForge | Static-first Astro CMS");
    await expect(page.getByRole("heading", { name: /Instant websites/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "BlockForge CMS" })).toHaveCount(0);
  });

  test("home page renders fast static content with SEO and schema", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("BlockForge | Static-first Astro CMS");
    await expect(page.getByRole("heading", { name: "Instant websites from structured content", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toContainText("About");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Build instant websites from structured CMS content/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/$/);
    await expectJsonLdType(page, "WebPage");

    const cmsBundleScripts = await page.locator('script[src*="/_astro/App."]').count();
    expect(cmsBundleScripts).toBe(0);
  });

  test("article page renders Article schema and article metadata", async ({ page }) => {
    await page.goto("/articles/static-first-cms/");

    await expect(page).toHaveTitle("How static-first CMS publishing works | BlockForge");
    await expect(page.getByRole("heading", { name: "How static-first CMS publishing works", exact: true })).toBeVisible();
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
      "content",
      "2026-05-29T00:00:00.000Z",
    );
    await expectJsonLdType(page, "Article");
  });

  test("category page only exists for public categories", async ({ page }) => {
    await page.goto("/category/guides/");

    await expect(page.getByRole("heading", { name: "Guides", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "How static-first CMS publishing works" })).toHaveAttribute(
      "href",
      "/articles/static-first-cms/",
    );
    await expectJsonLdType(page, "CollectionPage");
  });

  test("sitemap and robots expose indexable published routes", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    const sitemapXml = await sitemap.text();
    expect(sitemapXml).toContain("<loc>http://127.0.0.1:4321/</loc>");
    expect(sitemapXml).toContain("<loc>http://127.0.0.1:4321/about/</loc>");
    expect(sitemapXml).toContain("<loc>http://127.0.0.1:4321/articles/static-first-cms/</loc>");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    const robotsText = await robots.text();
    expect(robotsText).toContain("User-agent: *");
    expect(robotsText).toContain("Sitemap: http://127.0.0.1:4321/sitemap.xml");
  });

  test("missing public route returns 404", async ({ request }) => {
    const response = await request.get("/missing-route-for-e2e/");
    expect(response.status()).toBe(404);
  });
});
