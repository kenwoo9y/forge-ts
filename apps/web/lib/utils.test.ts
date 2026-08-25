import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("with no arguments: returns an empty string", () => {
    expect(cn()).toBe("");
  });

  it("with multiple class names: joins them with a space", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("with falsy values: excludes them and joins the rest", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("with undefined and null: ignores them and joins the rest", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("with an array of class names: joins them", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("with conflicting Tailwind classes: the last one wins", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("with conflicting Tailwind classes across groups: the last one wins", () => {
    expect(cn("px-4 py-2", "p-6")).toBe("p-6");
  });
});
