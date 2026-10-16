import { test, expect } from "@playwright/test";
import { hasTestUser, signIn } from "./helpers/auth";

test.describe("profile shows writer's content", () => {
  test.skip(!hasTestUser(), "Requires TEST_USER credentials");

  test("/profile renders the signed-in user's published posts", async ({ page }) => {
    await signIn(page);
    await page.goto("/profile");

    // Profile header
    await expect(page.getByRole("heading").first()).toBeVisible();

    // Either the empty state OR at least one post card / link to /post/...
    const anyPost = page.locator('a[href^="/post/"]').first();
    const emptyState = page.getByText(/no posts|haven['’]t published|nothing yet/i);

    await expect(anyPost.or(emptyState)).toBeVisible({ timeout: 15_000 });
  });
});