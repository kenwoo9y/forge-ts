import path from "node:path";
import { expect, test as setup } from "@playwright/test";

const authFile = path.join(
  import.meta.dirname,
  "../playwright/.auth/user.json",
);

const E2E_USERNAME = process.env.E2E_USERNAME || "e2e_test_user";
const E2E_PASSWORD = process.env.E2E_PASSWORD || "Password123!";

setup("authenticate", async ({ page }) => {
  await page.goto("/signin");

  await page.fill("#username", E2E_USERNAME);
  await page.fill("#password", E2E_PASSWORD);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/todos");

  await page.context().storageState({ path: authFile });
});
