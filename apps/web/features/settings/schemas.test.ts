import { describe, expect, it } from "vitest";
import { passwordFormSchema, profileFormSchema } from "./schemas";

describe("profileFormSchema", () => {
  it("有効な姓・名の場合：バリデーションが通る", () => {
    expect(
      profileFormSchema.safeParse({ lastName: "山田", firstName: "太郎" })
        .success,
    ).toBe(true);
  });

  it("空オブジェクトの場合：バリデーションが通る（すべて省略可能）", () => {
    expect(profileFormSchema.safeParse({}).success).toBe(true);
  });

  it("姓がちょうど40文字の場合：バリデーションが通る", () => {
    expect(
      profileFormSchema.safeParse({ lastName: "a".repeat(40) }).success,
    ).toBe(true);
  });

  it("姓が41文字の場合：バリデーションエラーになる", () => {
    const result = profileFormSchema.safeParse({ lastName: "a".repeat(41) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "姓は40文字以内で入力してください",
      );
    }
  });

  it("名がちょうど40文字の場合：バリデーションが通る", () => {
    expect(
      profileFormSchema.safeParse({ firstName: "a".repeat(40) }).success,
    ).toBe(true);
  });

  it("名が41文字の場合：バリデーションエラーになる", () => {
    const result = profileFormSchema.safeParse({ firstName: "a".repeat(41) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "名は40文字以内で入力してください",
      );
    }
  });
});

describe("passwordFormSchema", () => {
  const validData = {
    password: "password123",
    confirmPassword: "password123",
  };

  it("条件を満たす一致したパスワードの場合：バリデーションが通る", () => {
    expect(passwordFormSchema.safeParse(validData).success).toBe(true);
  });

  it("パスワードがちょうど8文字の場合：バリデーションが通る", () => {
    expect(
      passwordFormSchema.safeParse({
        password: "12345678",
        confirmPassword: "12345678",
      }).success,
    ).toBe(true);
  });

  it("パスワードが7文字の場合：バリデーションエラーになる", () => {
    const result = passwordFormSchema.safeParse({
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "パスワードは8文字以上で入力してください",
      );
    }
  });

  it("パスワードがちょうど128文字の場合：バリデーションが通る", () => {
    const password = "a".repeat(128);
    expect(
      passwordFormSchema.safeParse({ password, confirmPassword: password })
        .success,
    ).toBe(true);
  });

  it("パスワードが129文字の場合：バリデーションエラーになる", () => {
    const longPassword = "a".repeat(129);
    const result = passwordFormSchema.safeParse({
      password: longPassword,
      confirmPassword: longPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "パスワードは128文字以内で入力してください",
      );
    }
  });

  it("確認パスワードが一致しない場合：バリデーションエラーになる", () => {
    const result = passwordFormSchema.safeParse({
      password: "password123",
      confirmPassword: "different456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find((issue) =>
        issue.path.includes("confirmPassword"),
      );
      expect(confirmError?.message).toBe("パスワードが一致しません");
    }
  });
});
