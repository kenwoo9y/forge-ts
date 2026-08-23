import type { AppType } from "api";
import { type ErrorCode, errorMessages } from "error";
import { hc } from "hono/client";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export const apiClient = hc<AppType>(API_URL);

type JsonResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

export async function unwrap<T>(response: JsonResponse): Promise<T> {
  if (!response.ok) {
    const rawBody = await response.text();
    let body: { code?: ErrorCode } = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      // レスポンスがJSONでない場合（ALB/プロキシのエラーページ等）はそのまま握りつぶす
    }
    console.error(
      `[hono-client] request failed: status=${response.status} body=${rawBody.slice(0, 1000)}`,
    );
    const message =
      (body.code && errorMessages[body.code]) ??
      errorMessages.INTERNAL_SERVER_ERROR;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
