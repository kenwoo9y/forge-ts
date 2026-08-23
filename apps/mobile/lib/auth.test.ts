import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api-client';
import { signIn, signOut } from './auth';
import { storage } from './storage';

vi.mock('./api-client', () => ({
  api: { post: vi.fn() },
}));

vi.mock('./storage', () => ({
  storage: {
    setToken: vi.fn(),
    setUsername: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('signIn', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockResolvedValue({ token: 'jwt-token', username: 'testuser' });
  });

  it('api.post を /auth/signin に username と password で呼ぶ', async () => {
    await signIn('testuser', 'password123');
    expect(api.post).toHaveBeenCalledWith('/auth/signin', {
      username: 'testuser',
      password: 'password123',
    });
  });

  it('取得した token を storage に保存する', async () => {
    await signIn('testuser', 'password123');
    expect(storage.setToken).toHaveBeenCalledWith('jwt-token');
  });

  it('取得した username を storage に保存する', async () => {
    await signIn('testuser', 'password123');
    expect(storage.setUsername).toHaveBeenCalledWith('testuser');
  });

  it('api.post がエラーをスローした場合：そのままエラーを伝播する', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('ユーザーが見つかりません'));
    await expect(signIn('unknown', 'pass')).rejects.toThrow('ユーザーが見つかりません');
  });
});

describe('signOut', () => {
  it('storage.clear を呼ぶ', async () => {
    await signOut();
    expect(storage.clear).toHaveBeenCalled();
  });
});
