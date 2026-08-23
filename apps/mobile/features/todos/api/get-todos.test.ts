import { useQuery } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import { todosQueryKey, useTodos } from './get-todos';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/providers', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn() },
}));

const mockAuth = {
  token: 'test-token',
  username: 'testuser',
  isLoading: false,
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
};

describe('todosQueryKey', () => {
  it('["todos", { username }] を返す', () => {
    expect(todosQueryKey('testuser')).toEqual(['todos', { username: 'testuser' }]);
  });
});

describe('useTodos', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuth);
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false } as ReturnType<
      typeof useQuery
    >);
  });

  it('正しい queryKey で useQuery を呼ぶ', () => {
    useTodos();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['todos', { username: 'testuser' }] })
    );
  });

  it('token と username が存在する場合：enabled が true', () => {
    useTodos();
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('token が空の場合：enabled が false', () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockAuth, token: '' });
    useTodos();
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('username が空の場合：enabled が false', () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockAuth, username: '' });
    useTodos();
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn が正しいエンドポイントと Authorization ヘッダーで api.get を呼ぶ', () => {
    useTodos();
    const { queryFn } = vi.mocked(useQuery).mock.calls[0][0] as unknown as {
      queryFn: () => void;
    };
    queryFn();
    expect(api.get).toHaveBeenCalledWith('/users/testuser/tasks', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });
});
