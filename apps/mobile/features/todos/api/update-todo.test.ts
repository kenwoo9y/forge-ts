import { useMutation, useQueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TodoStatus } from '@/features/todos/types';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import { todoQueryKey } from './get-todo';
import { todosQueryKey } from './get-todos';
import { useUpdateTodo } from './update-todo';

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@/providers', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  api: { patch: vi.fn() },
}));

type UpdateTodoInput = {
  title: string | null;
  description: string | null;
  dueDate: string | null;
  status: TodoStatus | null;
};

const mockAuth = {
  token: 'test-token',
  username: 'testuser',
  isLoading: false,
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
};

const mockInvalidateQueries = vi.fn();

describe('useUpdateTodo', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuth);
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as unknown as ReturnType<typeof useQueryClient>);
    vi.mocked(useMutation).mockReturnValue({} as ReturnType<typeof useMutation>);
  });

  it('mutationFn が正しいエンドポイントと Authorization ヘッダーで api.patch を呼ぶ', () => {
    const input: UpdateTodoInput = {
      title: 'updated',
      description: null,
      dueDate: null,
      status: 'done',
    };
    useUpdateTodo('abc-123');
    const { mutationFn } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      mutationFn: (input: UpdateTodoInput) => void;
    };
    mutationFn(input);
    expect(api.patch).toHaveBeenCalledWith('/tasks/abc-123', input, {
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('onSuccess が該当 todo クエリを invalidate する', () => {
    useUpdateTodo('abc-123');
    const { onSuccess } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      onSuccess: () => void;
    };
    onSuccess();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: todoQueryKey('abc-123'),
    });
  });

  it('onSuccess が todos クエリを invalidate する', () => {
    useUpdateTodo('abc-123');
    const { onSuccess } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      onSuccess: () => void;
    };
    onSuccess();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: todosQueryKey('testuser'),
    });
  });
});
