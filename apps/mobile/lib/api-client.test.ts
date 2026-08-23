import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api-client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(options: { ok: boolean; status?: number; json?: () => Promise<unknown> }) {
  return {
    ok: options.ok,
    status: options.status ?? (options.ok ? 200 : 400),
    json: options.json ?? vi.fn().mockResolvedValue({}),
  };
}

describe('api.get', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true, json: () => Promise.resolve({ id: 1 }) }));
  });

  it('GET リクエストを正しい URL に送信する', async () => {
    await api.get('/users');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('Content-Type: application/json ヘッダーを付与する', async () => {
    await api.get('/users');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('追加ヘッダーをリクエストに付与する', async () => {
    await api.get('/users', { headers: { Authorization: 'Bearer token' } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    );
  });

  it('レスポンスの JSON を返す', async () => {
    const result = await api.get('/users');
    expect(result).toEqual({ id: 1 });
  });
});

describe('api.post', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true, json: () => Promise.resolve({ id: 1 }) }));
  });

  it('POST リクエストを JSON body 付きで送信する', async () => {
    await api.post('/users', { name: 'test' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'test' }) })
    );
  });

  it('body が undefined の場合：body なしで送信する', async () => {
    await api.post('/users');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: undefined })
    );
  });
});

describe('api.patch', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true, json: () => Promise.resolve({ id: 1 }) }));
  });

  it('PATCH リクエストを JSON body 付きで送信する', async () => {
    await api.patch('/users/1', { name: 'updated' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'updated' }) })
    );
  });
});

describe('api.delete', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true, status: 204 }));
  });

  it('DELETE リクエストを正しい URL に送信する', async () => {
    await api.delete('/users/1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('204 レスポンスの場合：undefined を返す', async () => {
    const result = await api.delete('/users/1');
    expect(result).toBeUndefined();
  });
});

describe('エラーハンドリング', () => {
  it.each([
    ['INVALID_CREDENTIALS', 'ユーザー名またはパスワードが正しくありません'],
    ['USERNAME_REQUIRED', 'ユーザー名は必須です'],
    ['USERNAME_DUPLICATE', 'このユーザー名はすでに使用されています'],
    ['EMAIL_DUPLICATE', 'このメールアドレスはすでに使用されています'],
    ['USER_NOT_FOUND', 'ユーザーが見つかりません'],
    ['PUBLIC_ID_REQUIRED', 'IDは必須です'],
    ['TASK_NOT_FOUND', 'ToDoが見つかりません'],
    ['INTERNAL_SERVER_ERROR', '予期しないエラーが発生しました'],
  ])('エラーコード "%s" の場合："%s" をスローする', async (code, message) => {
    mockFetch.mockResolvedValue(mockResponse({ ok: false, json: () => Promise.resolve({ code }) }));
    await expect(api.get('/test')).rejects.toThrow(message);
  });

  it('未知のエラーコードの場合：デフォルトメッセージをスローする', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ ok: false, json: () => Promise.resolve({ code: 'UNKNOWN_CODE' }) })
    );
    await expect(api.get('/test')).rejects.toThrow('予期しないエラーが発生しました');
  });

  it('レスポンス JSON のパースに失敗した場合：デフォルトメッセージをスローする', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ ok: false, json: () => Promise.reject(new Error('invalid json')) })
    );
    await expect(api.get('/test')).rejects.toThrow('予期しないエラーが発生しました');
  });
});
