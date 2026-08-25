import { afterEach, describe, expect, it, vi } from "vitest";
import { unwrap } from "./hono-client";

describe("unwrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("with a successful response: returns the JSON body", async () => {
    const response = new Response(JSON.stringify({ title: "Buy milk" }), {
      status: 200,
    });

    const result = await unwrap<{ title: string }>(response);

    expect(result).toEqual({ title: "Buy milk" });
  });

  it("with a 204 response: returns undefined", async () => {
    const response = new Response(null, { status: 204 });

    const result = await unwrap<void>(response);

    expect(result).toBeUndefined();
  });

  it("with a known error code: throws with the corresponding message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = new Response(JSON.stringify({ code: "USER_NOT_FOUND" }), {
      status: 404,
    });

    await expect(unwrap(response)).rejects.toThrow("User not found");
  });

  it("with an unknown error code: throws with the generic error message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = new Response(
      JSON.stringify({ code: "SOMETHING_UNKNOWN" }),
      {
        status: 500,
      },
    );

    await expect(unwrap(response)).rejects.toThrow(
      "An unexpected error occurred",
    );
  });

  it("when the body isn't JSON (e.g. an ALB/proxy error page): throws with the generic error message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = new Response("<html>Bad Gateway</html>", { status: 502 });

    await expect(unwrap(response)).rejects.toThrow(
      "An unexpected error occurred",
    );
  });
});
