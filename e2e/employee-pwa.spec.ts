import { test, expect } from "@playwright/test";

test.describe("Employee PWA — public pages", () => {
  test("offline page renders in Portuguese by default", async ({ page }) => {
    await page.goto("/pt/offline");
    await expect(page.getByRole("heading", { name: /sem ligação|no connection/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /tentar novamente|try again/i })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/pt/login");
    await expect(page.locator("body")).toBeVisible();
  });
});
