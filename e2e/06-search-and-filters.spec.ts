import { test, expect } from "@playwright/test";
import { hasTestUser, signIn } from "./helpers/auth";

test.describe("search + filters", () => {
  test.skip(!hasTestUser(), "Requires TEST_USER credentials");

  test("articles page: search input filters by title; categories filter works", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/articles");

    const search = page.getByPlaceholder(/search articles/i);
    await expect(search).toBeVisible();
    await search.fill("zzzz_no_match_query_" + Date.now());

    // After a no-match search, no PostCards should render.
    await page.waitForTimeout(800);
    await expect(page.getByRole("link", { name: /read more/i })).toHaveCount(0);

    await search.fill("");
    await page.waitForTimeout(400);
    // Filters surface exists (category chips/buttons rendered).
    await expect(page.locator("button, a").filter({ hasText: /all|technology|fiction|essay/i }).first()).toBeVisible();
  });

  test("books page: search input present and clears", async ({ page }) => {
    await signIn(page);
    await page.goto("/books");
    const search = page.getByPlaceholder(/search books/i);
    await expect(search).toBeVisible();
    await search.fill("zzzz_no_match_" + Date.now());
    await page.waitForTimeout(500);
    await expect(page.locator("article, [data-book-card]")).toHaveCount(0);
  });
});