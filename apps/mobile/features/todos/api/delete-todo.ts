import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import { todoQueryKey } from './get-todo';
import { todosQueryKey } from './get-todos';

export function useDeleteTodo(publicId: string) {
  const queryClient = useQueryClient();
  const { token, username } = useAuth();

  return useMutation({
    mutationFn: () =>
      api.delete(`/tasks/${publicId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todosQueryKey(username ?? '') });
      queryClient.removeQueries({ queryKey: todoQueryKey(publicId) });
    },
  });
}
