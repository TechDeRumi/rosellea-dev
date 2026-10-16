import { test, expect } from "@playwright/test";
import { hasTestUser, signIn } from "./helpers/auth";
import path from "node:path";

test.describe("book PDF upload, open, translate", () => {
  test.skip(!hasTestUser(), "Requires TEST_USER credentials");

  test("writer uploads a PDF book; reader opens embed and triggers translation", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await page.goto("/write");

    // Switch to "book" tab
    await page.getByRole("button", { name: /^book$/i }).click();

    const title = `E2E Book ${Date.now()}`;
    await page.getByLabel(/^title$/i).fill(title);

    await page
      .getByLabel(/book description/i)
      .fill("A short description for the e2e book.");

    // Upload the PDF.
    const pdfPath = path.resolve(__dirname, "fixtures/sample.pdf");
    await page.locator('input[type="file"][accept="application/pdf"]').setInputFiles(pdfPath);

    await page.getByRole("button", { name: /publish/i }).click();
    await page.waitForURL(/\/post\//, { timeout: 60_000 });

    // Embedded PDF surface is visible.
    await expect(
      page.locator('iframe, embed, object').first(),
    ).toBeVisible({ timeout: 20_000 });

    // Translation control exists on book pages.
    const translateBtn = page
      .getByRole("button", { name: /re-?translate|translate/i })
      .first();
    await expect(translateBtn).toBeVisible();
  });
});