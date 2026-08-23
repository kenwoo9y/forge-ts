import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./utils";

describe("formatDate", () => {
  it("null の場合：'-' を返す", () => {
    expect(formatDate(null)).toBe("-");
  });

  it("日時文字列を渡した場合：先頭10文字を返す", () => {
    expect(formatDate("2024-01-15T10:30:00Z")).toBe("2024-01-15");
  });

  it("ちょうど10文字の文字列の場合：そのまま返す", () => {
    expect(formatDate("2024-01-15")).toBe("2024-01-15");
  });
});

describe("formatDateTime", () => {
  it("null の場合：'-' を返す", () => {
    expect(formatDateTime(null)).toBe("-");
  });

  it("有効な日時文字列の場合：YYYY/MM/DD HH:mm 形式を返す", () => {
    const result = formatDateTime("2024-06-15T10:30:00.000Z");
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it("月が1桁の場合：2桁にゼロ埋めする", () => {
    const result = formatDateTime("2024-01-15T00:00:00.000Z");
    const [datePart] = result.split(" ");
    const [, month] = datePart.split("/");
    expect(month).toMatch(/^\d{2}$/);
  });

  it("日が1桁の場合：2桁にゼロ埋めする", () => {
    const result = formatDateTime("2024-06-05T00:00:00.000Z");
    const [datePart] = result.split(" ");
    const [, , day] = datePart.split("/");
    expect(day).toMatch(/^\d{2}$/);
  });

  it("時・分が1桁の場合：2桁にゼロ埋めする", () => {
    const result = formatDateTime("2024-06-15T00:04:00.000Z");
    const [, timePart] = result.split(" ");
    expect(timePart).toMatch(/^\d{2}:\d{2}$/);
  });
});
