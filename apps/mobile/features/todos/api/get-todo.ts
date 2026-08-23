import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import type { Todo } from '../types';

export const todoQueryKey = (publicId: string) => ['todos', publicId] as const;

export function useTodo(publicId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: todoQueryKey(publicId),
    queryFn: () =>
      api.get<Todo>(`/tasks/${publicId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token,
  });
}
