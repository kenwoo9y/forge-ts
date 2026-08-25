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

  it('calls api.post to /auth/signin with username and password', async () => {
    await signIn('testuser', 'password123');
    expect(api.post).toHaveBeenCalledWith('/auth/signin', {
      username: 'testuser',
      password: 'password123',
    });
  });

  it('saves the returned token to storage', async () => {
    await signIn('testuser', 'password123');
    expect(storage.setToken).toHaveBeenCalledWith('jwt-token');
  });

  it('saves the returned username to storage', async () => {
    await signIn('testuser', 'password123');
    expect(storage.setUsername).toHaveBeenCalledWith('testuser');
  });

  it('when api.post throws an error: propagates the error as-is', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('User not found'));
    await expect(signIn('unknown', 'pass')).rejects.toThrow('User not found');
  });
});

describe('signOut', () => {
  it('calls storage.clear', async () => {
    await signOut();
    expect(storage.clear).toHaveBeenCalled();
  });
});
