import type { app as App } from '../src/app.js';

/**
 * サインアップ・サインインを実APIエンドポイント経由で行い、認証済みリクエストに使うJWTを取得する。
 * @param app テスト対象の実app（`src/app.ts`）
 * @param username サインアップするユーザー名
 * @param password パスワード（省略時はテスト用の固定値）
 * @returns 発行されたJWT
 */
export async function signUpAndSignIn(
  app: typeof App,
  username: string,
  password = 'password123'
): Promise<string> {
  await app.request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const res = await app.request('/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = (await res.json()) as { token: string };
  return body.token;
}
