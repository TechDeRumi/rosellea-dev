import { test, expect } from "@playwright/test";
import { hasTestUser, signIn } from "./helpers/auth";

test.describe("likes + comments persistence (proxy for realtime)", () => {
  test.skip(!hasTestUser(), "Requires TEST_USER credentials");

  test("liking and commenting on a post persists across reload", async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page);
    await page.goto("/articles");

    const firstCard = page.getByRole("link", { name: /read more/i }).first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await page.waitForURL(/\/post\//);

    // Like
    const likeBtn = page.getByRole("button").filter({ has: page.locator("svg.lucide-heart") }).first();
    await likeBtn.click();
    await page.waitForTimeout(500);

    // Comment
    const stamp = Date.now();
    const text = `e2e-comment-${stamp}`;
    await page.getByPlaceholder(/share your thoughts/i).fill(text);
    await page.getByRole("button", { name: /post|comment|send/i }).first().click();
    await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });

    // Reload to confirm persistence (realtime subscriptions also re-hydrate here).
    await page.reload();
    await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });
  });
});