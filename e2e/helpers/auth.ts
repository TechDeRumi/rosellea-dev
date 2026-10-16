import { type Page, expect } from "@playwright/test";

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? "",
  password: process.env.TEST_USER_PASSWORD ?? "",
};

export function requireTestUser() {
  if (!TEST_USER.email || !TEST_USER.password) {
    throw new Error(
      "TEST_USER_EMAIL / TEST_USER_PASSWORD env vars are required for this test.",
    );
  }
}

/** Sign in via the real /auth page. Assumes the user already exists. */
export async function signIn(page: Page) {
  requireTestUser();
  await page.goto("/auth");
  // Wait for splash → auth redirect if we landed on "/".
  await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });

  // Ensure we're on the sign-in tab (not sign-up).
  const signInTab = page.getByRole("tab", { name: /sign\s*in/i });
  if (await signInTab.isVisible().catch(() => false)) {
    await signInTab.click();
  }

  await page.getByLabel(/email/i).first().fill(TEST_USER.email);
  await page.getByLabel(/password/i).first().fill(TEST_USER.password);
  await page
    .getByRole("button", { name: /^sign in$|^log in$/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/home|\/articles|\/books|\/profile/, {
    timeout: 20_000,
  });
}

/** True when test-user credentials are set in env. */
export function hasTestUser() {
  return !!TEST_USER.email && !!TEST_USER.password;
}