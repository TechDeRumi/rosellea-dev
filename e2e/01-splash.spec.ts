import { test, expect } from "@playwright/test";

test.describe("splash screen", () => {
  test("shows Rosellea logo (no hardcoded wordmark text) and redirects", async ({ page }) => {
    await page.goto("/");

    const logo = page.getByRole("img", { name: /rosellea/i }).first();
    await expect(logo).toBeVisible();

    // The src must come from the official asset (full logo png), not inline SVG text.
    const src = await logo.getAttribute("src");
    expect(src, "logo src should reference rosellea-logo asset").toMatch(/rosellea/i);

    // Tagline.
    await expect(page.getByText(/knowledge beyond language/i)).toBeVisible();

    // Should redirect to /auth (anonymous) or /home (signed in) within the splash window.
    await page.waitForURL(/\/(auth|home)/, { timeout: 10_000 });
  });
});