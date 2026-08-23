import { afterEach, describe, expect, it, vi } from "vitest";
import { unwrap } from "./hono-client";

describe("unwrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("成功レスポンスの場合：JSONボディを返す", async () => {
    const response = new Response(JSON.stringify({ title: "Buy milk" }), {
      status: 200,
    });

    const result = await unwrap<{ title: string }>(response);

    expect(result).toEqual({ title: "Buy milk" });
  });

  it("204の場合：undefinedを返す", async () => {
    const response = new Response(null, { status: 204 });

    const result = await unwrap<void>(response);

    expect(result).toBeUndefined();
  });

  it("既知のエラーコードの場合：対応する日本語メッセージでエラーをスローする", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = new Response(JSON.stringify({ code: "TASK_NOT_FOUND" }), {
      status: 404,
    });

    await expect(unwrap(response)).rejects.toThrow("ToDoが見つかりません");
  });

  it("未知のエラーコードの場合：汎用エラーメッセージでエラーをスローする", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = new Response(
      JSON.stringify({ code: "SOMETHING_UNKNOWN" }),
      {
        status: 500,
      },
    );

    await expect(unwrap(response)).rejects.toThrow(
      "予期しないエラーが発生しました",
    );
  });

  it("ボディがJSONでない場合（ALB/プロキシのエラーページ等）：汎用エラーメッセージでエラーをスローする", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = new Response("<html>Bad Gateway</html>", { status: 502 });

    await expect(unwrap(response)).rejects.toThrow(
      "予期しないエラーが発生しました",
    );
  });
});
