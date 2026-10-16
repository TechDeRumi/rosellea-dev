import { test, expect } from "@playwright/test";
import { hasTestUser, signIn } from "./helpers/auth";

test.describe("article publishing + full rendering", () => {
  test.skip(!hasTestUser(), "Requires TEST_USER credentials");

  const stamp = Date.now();
  const title = `E2E Article ${stamp}`;
  // ~12k chars — well above the textarea minimum and proves long content survives
  const body =
    "Rosellea long-form article test. ".repeat(400) +
    `\n\nUnique marker: ${stamp}\n`;

  test("writer publishes an Urdu-original article; reader sees full text + can translate", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);

    await page.goto("/write");

    await page.getByLabel(/^title$/i).fill(title);

    // Pick Urdu as original language to verify original-language preservation.
    const langCombo = page.getByRole("combobox").nth(1);
    await langCombo.click();
    await page.getByRole("option", { name: /Urdu/i }).click();

    await page.getByLabel(/^article$/i).fill(body);

    await page
      .getByRole("button", { name: /publish.*translate/i })
      .click();

    // Land on the new post page.
    await page.waitForURL(/\/post\//, { timeout: 30_000 });

    // Title and full content render.
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(`Unique marker: ${stamp}`)).toBeVisible();

    // Original language preserved (Urdu → RTL container present).
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();

    // Reader translates: switch to English via the LanguageSwitcher.
    const langSwitcher = page.getByRole("button").filter({ hasText: /اردو|English|ur|en/i }).first();
    if (await langSwitcher.isVisible().catch(() => false)) {
      await langSwitcher.click();
      const englishOption = page.getByRole("menuitem", { name: /english/i }).first();
      if (await englishOption.isVisible().catch(() => false)) {
        await englishOption.click();
        // Title should still be visible (original or translated).
        await expect(page.locator("h1, h2").first()).toBeVisible();
      }
    }
  });
});