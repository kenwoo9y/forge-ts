import { useMutation, useQueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TodoStatus } from '@/features/todos/types';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import { useCreateTodo } from './create-todo';
import { todosQueryKey } from './get-todos';

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@/providers', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  api: { post: vi.fn() },
}));

type CreateTodoInput = {
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

describe('useCreateTodo', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuth);
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as unknown as ReturnType<typeof useQueryClient>);
    vi.mocked(useMutation).mockReturnValue({} as ReturnType<typeof useMutation>);
  });

  it('mutationFn が正しいエンドポイントと Authorization ヘッダーで api.post を呼ぶ', () => {
    const input: CreateTodoInput = {
      title: 'new task',
      description: null,
      dueDate: null,
      status: 'todo',
    };
    useCreateTodo();
    const { mutationFn } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      mutationFn: (input: CreateTodoInput) => void;
    };
    mutationFn(input);
    expect(api.post).toHaveBeenCalledWith('/users/testuser/tasks', input, {
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('onSuccess が todos クエリを invalidate する', () => {
    useCreateTodo();
    const { onSuccess } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      onSuccess: () => void;
    };
    onSuccess();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: todosQueryKey('testuser'),
    });
  });

  it('username が null の場合：onSuccess が空文字で todosQueryKey を invalidate する', () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockAuth, username: null });
    useCreateTodo();
    const { onSuccess } = vi.mocked(useMutation).mock.calls[0][0] as unknown as {
      onSuccess: () => void;
    };
    onSuccess();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: todosQueryKey(''),
    });
  });
});
