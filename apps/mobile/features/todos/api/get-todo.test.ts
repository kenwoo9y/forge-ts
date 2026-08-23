import { useQuery } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import { todoQueryKey, useTodo } from './get-todo';

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

describe('todoQueryKey', () => {
  it('["todos", publicId] を返す', () => {
    expect(todoQueryKey('abc-123')).toEqual(['todos', 'abc-123']);
  });
});

describe('useTodo', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuth);
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false } as ReturnType<
      typeof useQuery
    >);
  });

  it('正しい queryKey で useQuery を呼ぶ', () => {
    useTodo('abc-123');
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['todos', 'abc-123'] })
    );
  });

  it('token が存在する場合：enabled が true', () => {
    useTodo('abc-123');
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('token が空の場合：enabled が false', () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockAuth, token: '' });
    useTodo('abc-123');
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn が正しいエンドポイントと Authorization ヘッダーで api.get を呼ぶ', () => {
    useTodo('abc-123');
    const { queryFn } = vi.mocked(useQuery).mock.calls[0][0] as unknown as {
      queryFn: () => void;
    };
    queryFn();
    expect(api.get).toHaveBeenCalledWith('/tasks/abc-123', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });
});
