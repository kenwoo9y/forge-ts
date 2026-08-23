import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("引数なしの場合：空文字を返す", () => {
    expect(cn()).toBe("");
  });

  it("複数のクラス名を渡した場合：スペース区切りで結合する", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("falsy な値を含む場合：除外して結合する", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("undefined と null を含む場合：無視して結合する", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("配列形式のクラス名を渡した場合：結合する", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("Tailwind クラスがコンフリクトする場合：後勝ちで解決する", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("グループをまたいだ Tailwind クラスがコンフリクトする場合：後勝ちで解決する", () => {
    expect(cn("px-4 py-2", "p-6")).toBe("p-6");
  });
});
