import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { apiClient, unwrap } from "@/lib/hono-client";
import { getUserAction, updateUserAction } from "./actions";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

// next-authのauth()はミドルウェアとしても呼び出せるオーバーロード型を持つため、
// vi.mockedの型推論がその方に寄ってしまう。セッション取得の型に固定してキャストする。
const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);
vi.mock("@/lib/hono-client", () => ({
  apiClient: {
    users: {
      ":username": { $get: vi.fn(), $patch: vi.fn() },
    },
  },
  unwrap: vi.fn(),
}));

const fakeResponse = { ok: true } as never;

describe("settings actions", () => {
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

      await expect(getUserAction()).rejects.toThrow("認証が必要です");
    });

    it("セッションにユーザー名がない場合：エラーをスローする", async () => {
      mockedAuth.mockResolvedValue({
        apiToken: "token123",
        user: {},
        expires: "2099-01-01T00:00:00.000Z",
      } as never);

      await expect(getUserAction()).rejects.toThrow("認証が必要です");
    });

    it("未認証の場合：エラーをスローする", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(getUserAction()).rejects.toThrow("認証が必要です");
    });
  });

  it("getUserAction: セッションのユーザー名でAPIを呼ぶ", async () => {
    vi.mocked(apiClient.users[":username"].$get).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockResolvedValue({ username: "alice" });

    await getUserAction();

    expect(apiClient.users[":username"].$get).toHaveBeenCalledWith(
      { param: { username: "alice" } },
      { headers: { Authorization: "Bearer token123" } },
    );
  });

  it("updateUserAction: 正しいパラメータでAPIを呼ぶ", async () => {
    vi.mocked(apiClient.users[":username"].$patch).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockResolvedValue({
      username: "alice",
      firstName: "Alice",
    });

    await updateUserAction({ firstName: "Alice" });

    expect(apiClient.users[":username"].$patch).toHaveBeenCalledWith(
      { param: { username: "alice" }, json: { firstName: "Alice" } },
      { headers: { Authorization: "Bearer token123" } },
    );
  });

  it("APIがエラーを返す場合：エラーが伝播する", async () => {
    vi.mocked(apiClient.users[":username"].$patch).mockResolvedValue(
      fakeResponse,
    );
    vi.mocked(unwrap).mockRejectedValue(
      new Error("このメールアドレスはすでに使用されています"),
    );

    await expect(
      updateUserAction({ email: "taken@example.com" }),
    ).rejects.toThrow("このメールアドレスはすでに使用されています");
  });
});
