import { test, expect } from "@playwright/test";
import { hasTestUser, signIn } from "./helpers/auth";

test.describe("bottom navigation (mobile)", () => {
  test.skip(!hasTestUser(), "Requires TEST_USER credentials");

  test("floating pill nav with 4 tabs + write FAB, navigates between sections", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/home");

    // 4 nav links live in the bottom pill.
    const nav = page.locator("nav.fixed.bottom-4");
    await expect(nav).toBeVisible();
    for (const label of ["Home", "Articles", "Books", "Profile"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }

    // Floating Write FAB
    await expect(page.getByRole("link", { name: /write/i })).toBeVisible();

    // Navigate Home → Articles → Books → Profile
    await nav.getByRole("link", { name: "Articles" }).click();
    await expect(page).toHaveURL(/\/articles/);

    await nav.getByRole("link", { name: "Books" }).click();
    await expect(page).toHaveURL(/\/books/);

    await nav.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile/);
  });
});