const errorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: 'ユーザー名またはパスワードが正しくありません',
  USERNAME_REQUIRED: 'ユーザー名は必須です',
  USERNAME_DUPLICATE: 'このユーザー名はすでに使用されています',
  EMAIL_DUPLICATE: 'このメールアドレスはすでに使用されています',
  USER_NOT_FOUND: 'ユーザーが見つかりません',
  PUBLIC_ID_REQUIRED: 'IDは必須です',
  TASK_NOT_FOUND: 'ToDoが見つかりません',
  INTERNAL_SERVER_ERROR: '予期しないエラーが発生しました',
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
