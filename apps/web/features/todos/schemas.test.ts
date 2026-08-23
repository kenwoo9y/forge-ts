import { describe, expect, it } from "vitest";
import { todoFormSchema } from "./schemas";

describe("todoFormSchema", () => {
  const validData = {
    title: "Test Todo",
    status: "todo" as const,
  };

  describe("title", () => {
    it("有効なタイトルの場合：バリデーションが通る", () => {
      expect(todoFormSchema.safeParse(validData).success).toBe(true);
    });

    it("タイトルが空の場合：バリデーションエラーになる", () => {
      const result = todoFormSchema.safeParse({ ...validData, title: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("タイトルは必須です");
      }
    });

    it("タイトルが31文字の場合：バリデーションエラーになる", () => {
      const result = todoFormSchema.safeParse({
        ...validData,
        title: "a".repeat(31),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "タイトルは30文字以内で入力してください",
        );
      }
    });

    it("タイトルがちょうど30文字の場合：バリデーションが通る", () => {
      expect(
        todoFormSchema.safeParse({ ...validData, title: "a".repeat(30) })
          .success,
      ).toBe(true);
    });
  });

  describe("description", () => {
    it("詳細が null の場合：バリデーションが通る", () => {
      expect(
        todoFormSchema.safeParse({ ...validData, description: null }).success,
      ).toBe(true);
    });

    it("詳細が undefined の場合：バリデーションが通る", () => {
      expect(todoFormSchema.safeParse({ ...validData }).success).toBe(true);
    });

    it("詳細がちょうど255文字の場合：バリデーションが通る", () => {
      expect(
        todoFormSchema.safeParse({ ...validData, description: "a".repeat(255) })
          .success,
      ).toBe(true);
    });

    it("詳細が256文字の場合：バリデーションエラーになる", () => {
      const result = todoFormSchema.safeParse({
        ...validData,
        description: "a".repeat(256),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "詳細は255文字以内で入力してください",
        );
      }
    });
  });

  describe("status", () => {
    it.each(["todo", "doing", "done"] as const)(
      "ステータスが '%s' の場合：バリデーションが通る",
      (status) => {
        expect(todoFormSchema.safeParse({ ...validData, status }).success).toBe(
          true,
        );
      },
    );

    it("ステータスが無効な値の場合：バリデーションエラーになる", () => {
      const result = todoFormSchema.safeParse({
        ...validData,
        status: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("dueDate", () => {
    it("期日が null の場合：バリデーションが通る", () => {
      expect(
        todoFormSchema.safeParse({ ...validData, dueDate: null }).success,
      ).toBe(true);
    });

    it("期日が文字列の場合：バリデーションが通る", () => {
      expect(
        todoFormSchema.safeParse({ ...validData, dueDate: "2024-12-31" })
          .success,
      ).toBe(true);
    });

    it("期日が undefined の場合：バリデーションが通る", () => {
      expect(todoFormSchema.safeParse({ ...validData }).success).toBe(true);
    });
  });
});
