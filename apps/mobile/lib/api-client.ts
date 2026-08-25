const errorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect username or password',
  USERNAME_REQUIRED: 'Username is required',
  USERNAME_DUPLICATE: 'This username is already taken',
  USER_NOT_FOUND: 'User not found',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type RequestOptions = {
  headers?: Record<string, string>;
};

async function fetchApi<T>(path: string, options: RequestInit & RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code = (body as { code?: string }).code;
    const message = (code && errorMessages[code]) ?? errorMessages.INTERNAL_SERVER_ERROR;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    fetchApi<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    fetchApi<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    fetchApi<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    fetchApi<T>(path, { method: 'DELETE', ...options }),
};
