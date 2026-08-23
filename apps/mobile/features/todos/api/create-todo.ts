import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import type { Todo, TodoStatus } from '../types';
import { todosQueryKey } from './get-todos';

type CreateTodoInput = {
  title: string | null;
  description: string | null;
  dueDate: string | null;
  status: TodoStatus | null;
};

export function useCreateTodo() {
  const queryClient = useQueryClient();
  const { token, username } = useAuth();

  return useMutation({
    mutationFn: (input: CreateTodoInput) =>
      api.post<Todo>(`/users/${username}/tasks`, input, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todosQueryKey(username ?? '') });
    },
  });
}
