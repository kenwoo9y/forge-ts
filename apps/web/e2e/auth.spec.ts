import { expect, test } from "@playwright/test";

const E2E_USERNAME = process.env.E2E_USERNAME ?? "e2e_test_user";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Password123!";

test.describe("ログインページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signin");
  });

  test("ログインページが表示される", async ({ page }) => {
    await expect(page).toHaveTitle(/.*/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("正しい認証情報でログインするとToDoリストにリダイレクトされる", async ({
    page,
  }) => {
    await page.fill("#username", E2E_USERNAME);
    await page.fill("#password", E2E_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/todos");
    await expect(
      page.getByRole("heading", { name: "ToDoリスト" }),
    ).toBeVisible();
  });

  test("誤った認証情報でログインするとエラーメッセージが表示される", async ({
    page,
  }) => {
    await page.fill("#username", "wrong_user");
    await page.fill("#password", "wrong_password");
    await page.click('button[type="submit"]');

    await expect(
      page.getByText("ユーザー名またはパスワードが正しくありません"),
    ).toBeVisible();
    await expect(page).toHaveURL("/signin");
  });

  test("ユーザー名未入力でバリデーションエラーが表示される", async ({
    page,
  }) => {
    await page.click('button[type="submit"]');

    await expect(page.locator("p.text-red-500").first()).toBeVisible();
  });

  test("アカウント作成ページへのリンクが機能する", async ({ page }) => {
    await page.getByRole("link", { name: "アカウント作成" }).click();

    await expect(page).toHaveURL("/signup");
  });
});

test.describe("アカウント作成ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("アカウント作成ページが表示される", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "アカウント作成" }),
    ).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "アカウント作成" }),
    ).toBeVisible();
  });

  test("パスワードが一致しない場合にエラーが表示される", async ({ page }) => {
    await page.fill("#username", "newUser");
    await page.fill("#password", "Password123!");
    await page.fill("#confirmPassword", "DifferentPassword!");
    await page.click('button[type="submit"]');

    await expect(page.getByText("パスワードが一致しません")).toBeVisible();
  });

  test("ログインページへのリンクが機能する", async ({ page }) => {
    await page.getByRole("link", { name: "ログイン" }).click();

    await expect(page).toHaveURL("/signin");
  });
});

test.describe("認証保護", () => {
  test("未認証でToDoリストにアクセスするとログインページにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/todos");

    await expect(page).toHaveURL(/\/signin/);
  });

  test("未認証で設定ページにアクセスするとログインページにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/settings");

    await expect(page).toHaveURL(/\/signin/);
  });
});
