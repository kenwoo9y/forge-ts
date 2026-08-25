import { expect, test } from "@playwright/test";

const E2E_USERNAME = process.env.E2E_USERNAME ?? "e2e_test_user";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Password123!";

test.describe("Sign-in page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signin");
  });

  test("displays the sign-in page", async ({ page }) => {
    await expect(page).toHaveTitle(/.*/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("redirects to home when signing in with valid credentials", async ({
    page,
  }) => {
    await page.fill("#username", E2E_USERNAME);
    await page.fill("#password", E2E_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  });

  test("shows an error message when signing in with invalid credentials", async ({
    page,
  }) => {
    await page.fill("#username", "wrong_user");
    await page.fill("#password", "wrong_password");
    await page.click('button[type="submit"]');

    await expect(
      page.getByText("Incorrect username or password"),
    ).toBeVisible();
    await expect(page).toHaveURL("/signin");
  });

  test("shows a validation error when the username is empty", async ({
    page,
  }) => {
    await page.click('button[type="submit"]');

    await expect(page.locator("p.text-red-500").first()).toBeVisible();
  });

  test("the link to the sign-up page works", async ({ page }) => {
    await page.getByRole("link", { name: "Sign up" }).click();

    await expect(page).toHaveURL("/signup");
  });
});

test.describe("Sign-up page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("displays the sign-up page", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Create account" }),
    ).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
  });

  test("shows an error when the passwords do not match", async ({ page }) => {
    await page.fill("#username", "newUser");
    await page.fill("#password", "Password123!");
    await page.fill("#confirmPassword", "DifferentPassword!");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("the link to the sign-in page works", async ({ page }) => {
    await page.getByRole("link", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/signin");
  });
});

test.describe("Auth protection", () => {
  test("redirects to the sign-in page when accessing home unauthenticated", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/signin/);
  });
});
