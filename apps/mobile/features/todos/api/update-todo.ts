import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import type { Todo, TodoStatus } from '../types';
import { todoQueryKey } from './get-todo';
import { todosQueryKey } from './get-todos';

type UpdateTodoInput = {
  title: string | null;
  description: string | null;
  dueDate: string | null;
  status: TodoStatus | null;
};

export function useUpdateTodo(publicId: string) {
  const queryClient = useQueryClient();
  const { token, username } = useAuth();

  return useMutation({
    mutationFn: (input: UpdateTodoInput) =>
      api.patch<Todo>(`/tasks/${publicId}`, input, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoQueryKey(publicId) });
      queryClient.invalidateQueries({ queryKey: todosQueryKey(username ?? '') });
    },
  });
}
