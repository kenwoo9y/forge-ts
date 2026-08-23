import { expect, test } from "@playwright/test";

test.describe("ToDoリスト", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/todos");
    await expect(
      page.getByRole("heading", { name: "ToDoリスト" }),
    ).toBeVisible();
  });

  test("ToDoリストページが表示される", async ({ page }) => {
    await expect(page.getByRole("button", { name: "新規追加" })).toBeVisible();
  });

  test("新規追加ボタンをクリックするとダイアログが開く", async ({ page }) => {
    await page.getByRole("button", { name: "新規追加" }).click();

    await expect(
      page.getByRole("heading", { name: "新しいToDoを追加" }),
    ).toBeVisible();
    await expect(page.locator("#title")).toBeVisible();
    await expect(page.locator("#description")).toBeVisible();
    await expect(page.locator("#dueDate")).toBeVisible();
    await expect(page.locator("#status")).toBeVisible();
  });

  test("キャンセルボタンでダイアログが閉じる", async ({ page }) => {
    await page.getByRole("button", { name: "新規追加" }).click();
    await expect(
      page.getByRole("heading", { name: "新しいToDoを追加" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "キャンセル" }).click();

    await expect(
      page.getByRole("heading", { name: "新しいToDoを追加" }),
    ).not.toBeVisible();
  });

  test("閉じるボタン(X)でダイアログが閉じる", async ({ page }) => {
    await page.getByRole("button", { name: "新規追加" }).click();
    await expect(
      page.getByRole("heading", { name: "新しいToDoを追加" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "閉じる" }).click();

    await expect(
      page.getByRole("heading", { name: "新しいToDoを追加" }),
    ).not.toBeVisible();
  });

  test("新しいToDoを作成できる", async ({ page }) => {
    const todoTitle = `E2Eテスト用Todo ${Date.now()}`;

    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.fill("#description", "E2Eテストで作成したTodo");
    await page.fill("#dueDate", "2026-12-31");
    await page.selectOption("#status", "doing");
    await page.getByRole("button", { name: "追加", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "新しいToDoを追加" }),
    ).not.toBeVisible();
    await expect(page.getByText(todoTitle)).toBeVisible();
  });

  test("ToDoを編集できる", async ({ page }) => {
    const todoTitle = `編集テスト用Todo ${Date.now()}`;
    const updatedTitle = `更新済みTodo ${Date.now()}`;

    // まず新規Todoを作成
    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText(todoTitle)).toBeVisible();

    // 編集ボタンをクリック
    const row = page.getByRole("row").filter({ hasText: todoTitle });
    await row.getByRole("button", { name: "編集" }).click();

    await expect(
      page.getByRole("heading", { name: "ToDoを編集" }),
    ).toBeVisible();

    // タイトルを更新
    await page.fill("#edit-title", updatedTitle);
    await page.getByRole("button", { name: "更新" }).click();

    await expect(
      page.getByRole("heading", { name: "ToDoを編集" }),
    ).not.toBeVisible();
    await expect(page.getByText(updatedTitle)).toBeVisible();
  });

  test("ToDoを削除できる", async ({ page }) => {
    const todoTitle = `削除テスト用Todo ${Date.now()}`;

    // まず新規Todoを作成
    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText(todoTitle)).toBeVisible();

    // 削除ボタンをクリック
    const row = page.getByRole("row").filter({ hasText: todoTitle });
    await row.getByRole("button", { name: "削除" }).click();

    await expect(
      page.getByRole("heading", { name: "ToDoを削除" }),
    ).toBeVisible();
    await expect(
      page.getByRole("paragraph").filter({ hasText: todoTitle }),
    ).toBeVisible();

    await page.getByRole("button", { name: "削除する" }).click();

    await expect(
      page.getByRole("heading", { name: "ToDoを削除" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: todoTitle }),
    ).not.toBeVisible();
  });

  test("削除ダイアログでキャンセルするとToDoが残る", async ({ page }) => {
    const todoTitle = `削除キャンセルテスト用Todo ${Date.now()}`;

    // まず新規Todoを作成
    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText(todoTitle)).toBeVisible();

    // 削除ボタンをクリックしてキャンセル
    const row = page.getByRole("row").filter({ hasText: todoTitle });
    await row.getByRole("button", { name: "削除" }).click();
    await page.getByRole("button", { name: "キャンセル" }).click();

    await expect(page.getByText(todoTitle)).toBeVisible();
  });

  test("ToDoの行をクリックすると詳細ページに遷移する", async ({ page }) => {
    const todoTitle = `詳細テスト用Todo ${Date.now()}`;

    // まず新規Todoを作成
    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText(todoTitle)).toBeVisible();

    // 行をクリック（操作ボタン以外）
    const row = page.getByRole("row").filter({ hasText: todoTitle });
    await row.getByRole("cell", { name: todoTitle }).click();

    await expect(page).toHaveURL(/\/todos\/.+/);
    await expect(page.getByRole("heading", { name: "ToDo詳細" })).toBeVisible();
  });
});

test.describe("ToDo詳細ページ", () => {
  test("詳細ページが表示される", async ({ page }) => {
    // リストページで新規Todoを作成し、詳細ページへ遷移
    await page.goto("/todos");
    const todoTitle = `詳細ページテスト用Todo ${Date.now()}`;
    const todoDescription = "E2Eテスト用の詳細説明";

    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.fill("#description", todoDescription);
    await page.fill("#dueDate", "2026-12-31");
    await page.selectOption("#status", "todo");
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText(todoTitle)).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: todoTitle });
    await row.getByRole("cell", { name: todoTitle }).click();

    await expect(page).toHaveURL(/\/todos\/.+/);
    await expect(page.getByRole("heading", { name: "ToDo詳細" })).toBeVisible();
    await expect(page.getByText(todoTitle)).toBeVisible();
    await expect(page.getByText(todoDescription)).toBeVisible();
    await expect(page.getByText("未着手")).toBeVisible();
  });

  test("一覧に戻るリンクが機能する", async ({ page }) => {
    // リストページで新規Todoを作成し、詳細ページへ遷移
    await page.goto("/todos");
    const todoTitle = `戻るリンクテスト用Todo ${Date.now()}`;

    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText(todoTitle)).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: todoTitle });
    await row.getByRole("cell", { name: todoTitle }).click();
    await expect(page).toHaveURL(/\/todos\/.+/);

    await page.getByRole("link", { name: "一覧に戻る" }).click();

    await expect(page).toHaveURL("/todos");
    await expect(
      page.getByRole("heading", { name: "ToDoリスト" }),
    ).toBeVisible();
  });

  test("詳細ページから編集ができる", async ({ page }) => {
    await page.goto("/todos");
    const todoTitle = `詳細編集テスト用Todo ${Date.now()}`;
    const updatedTitle = `詳細から更新済みTodo ${Date.now()}`;

    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText(todoTitle)).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: todoTitle });
    await row.getByRole("cell", { name: todoTitle }).click();
    await expect(page).toHaveURL(/\/todos\/.+/);

    await page.getByRole("button", { name: "編集" }).click();
    await expect(
      page.getByRole("heading", { name: "ToDoを編集" }),
    ).toBeVisible();

    await page.fill("#edit-title", updatedTitle);
    await page.getByRole("button", { name: "更新" }).click();

    await expect(
      page.getByRole("heading", { name: "ToDoを編集" }),
    ).not.toBeVisible();
    await expect(page.getByText(updatedTitle)).toBeVisible();
  });

  test("詳細ページから削除するとリストページに戻る", async ({ page }) => {
    await page.goto("/todos");
    const todoTitle = `詳細削除テスト用Todo ${Date.now()}`;

    await page.getByRole("button", { name: "新規追加" }).click();
    await page.fill("#title", todoTitle);
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText(todoTitle)).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: todoTitle });
    await row.getByRole("cell", { name: todoTitle }).click();
    await expect(page).toHaveURL(/\/todos\/.+/);

    await page.getByRole("button", { name: "削除" }).click();
    await expect(
      page.getByRole("heading", { name: "ToDoを削除" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page).toHaveURL("/todos");
  });
});
