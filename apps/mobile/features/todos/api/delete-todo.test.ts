import { useMutation, useQueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import { useDeleteTodo } from './delete-todo';
import { todoQueryKey } from './get-todo';
import { todosQueryKey } from './get-todos';

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@/providers', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  api: { delete: vi.fn() },
}));

const mockAuth = {
  token: 'test-token',
  username: 'testuser',
  isLoading: false,
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
};

const mockInvalidateQueries = vi.fn();
const mockRemoveQueries = vi.fn();

describe('useDeleteTodo', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuth);
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      removeQueries: mockRemoveQueries,
    } as unknown as ReturnType<typeof useQueryClient>);
    vi.mocked(useMutation).mockReturnValue({} as ReturnType<typeof useMutation>);
  });

  it('mutationFn が正しいエンドポイントと Authorization ヘッダーで api.delete を呼ぶ', () => {
    useDeleteTodo('abc-123');
    const { mutationFn } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      mutationFn: () => void;
    };
    mutationFn();
    expect(api.delete).toHaveBeenCalledWith('/tasks/abc-123', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('onSuccess が todos クエリを invalidate する', () => {
    useDeleteTodo('abc-123');
    const { onSuccess } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      onSuccess: () => void;
    };
    onSuccess();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: todosQueryKey('testuser'),
    });
  });

  it('onSuccess が該当 todo クエリを remove する', () => {
    useDeleteTodo('abc-123');
    const { onSuccess } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      onSuccess: () => void;
    };
    onSuccess();
    expect(mockRemoveQueries).toHaveBeenCalledWith({
      queryKey: todoQueryKey('abc-123'),
    });
  });
});
