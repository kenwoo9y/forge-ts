import type { app as App } from '../src/app.js';

/**
 * Signs up and signs in via the real API endpoints, and obtains a JWT for use in authenticated requests.
 * @param app The real app under test (`src/app.ts`)
 * @param username The username to sign up with
 * @param password The password (defaults to a fixed value for tests)
 * @returns The issued JWT
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
