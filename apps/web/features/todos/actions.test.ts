import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { apiClient, unwrap } from "@/lib/hono-client";
import {
  createTodoAction,
  deleteTodoAction,
  getTodoAction,
  getTodosAction,
  updateTodoAction,
} from "./actions";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

// next-authのauth()はミドルウェアとしても呼び出せるオーバーロード型を持つため、
// vi.mockedの型推論がその方に寄ってしまう。セッション取得の型に固定してキャストする。
const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);
vi.mock("@/lib/hono-client", () => ({
  apiClient: {
    users: {
      ":username": {
        tasks: { $get: vi.fn(), $post: vi.fn() },
      },
    },
    tasks: {
      ":publicId": { $get: vi.fn(), $patch: vi.fn(), $delete: vi.fn() },
    },
  },
  unwrap: vi.fn(),
}));

const fakeResponse = { ok: true } as never;

describe("todos actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuth.mockResolvedValue({
      apiToken: "token123",
      user: { name: "alice" },
      expires: "2099-01-01T00:00:00.000Z",
    });
  });

  describe("認証", () => {
    it("セッションにapiTokenがない場合：エラーをスローする", async () => {
      mockedAuth.mockResolvedValue({
        user: { name: "alice" },
        expires: "2099-01-01T00:00:00.000Z",
      } as never);

      await expect(getTodosAction("alice")).rejects.toThrow("認証が必要です");
    });

    it("未認証の場合：エラーをスローする", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(getTodosAction("alice")).rejects.toThrow("認証が必要です");
    });
  });

  it("getTodosAction: 正しいパラメータでAPIを呼び、レスポンスを返す", async () => {
    vi.mocked(apiClient.users[":username"].tasks.$get).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockResolvedValue([{ title: "Buy milk" }]);

    const result = await getTodosAction("alice");

    expect(apiClient.users[":username"].tasks.$get).toHaveBeenCalledWith(
      { param: { username: "alice" } },
      { headers: { Authorization: "Bearer token123" } },
    );
    expect(unwrap).toHaveBeenCalledWith(fakeResponse);
    expect(result).toEqual([{ title: "Buy milk" }]);
  });

  it("getTodoAction: 正しいパラメータでAPIを呼ぶ", async () => {
    vi.mocked(apiClient.tasks[":publicId"].$get).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockResolvedValue({ title: "Buy milk" });

    await getTodoAction("public-id-1");

    expect(apiClient.tasks[":publicId"].$get).toHaveBeenCalledWith(
      { param: { publicId: "public-id-1" } },
      { headers: { Authorization: "Bearer token123" } },
    );
  });

  it("createTodoAction: 正しいパラメータでAPIを呼ぶ", async () => {
    vi.mocked(apiClient.users[":username"].tasks.$post).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockResolvedValue({ title: "Buy milk" });

    await createTodoAction("alice", {
      title: "Buy milk",
      status: "todo",
    } as never);

    expect(apiClient.users[":username"].tasks.$post).toHaveBeenCalledWith(
      {
        param: { username: "alice" },
        json: { title: "Buy milk", status: "todo" },
      },
      { headers: { Authorization: "Bearer token123" } },
    );
  });

  it("updateTodoAction: 正しいパラメータでAPIを呼ぶ", async () => {
    vi.mocked(apiClient.tasks[":publicId"].$patch).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockResolvedValue({ title: "Updated" });

    await updateTodoAction("public-id-1", { title: "Updated" } as never);

    expect(apiClient.tasks[":publicId"].$patch).toHaveBeenCalledWith(
      { param: { publicId: "public-id-1" }, json: { title: "Updated" } },
      { headers: { Authorization: "Bearer token123" } },
    );
  });

  it("deleteTodoAction: 正しいパラメータでAPIを呼ぶ", async () => {
    vi.mocked(apiClient.tasks[":publicId"].$delete).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockResolvedValue(undefined);

    await deleteTodoAction("public-id-1");

    expect(apiClient.tasks[":publicId"].$delete).toHaveBeenCalledWith(
      { param: { publicId: "public-id-1" } },
      { headers: { Authorization: "Bearer token123" } },
    );
  });

  it("APIがエラーを返す場合：エラーが伝播する", async () => {
    vi.mocked(apiClient.tasks[":publicId"].$get).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockRejectedValue(new Error("ToDoが見つかりません"));

    await expect(getTodoAction("nonexistent")).rejects.toThrow(
      "ToDoが見つかりません",
    );
  });
});
