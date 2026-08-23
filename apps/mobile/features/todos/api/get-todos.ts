import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers';
import type { Todo } from '../types';

export const todosQueryKey = (username: string) => ['todos', { username }] as const;

export function useTodos() {
  const { username, token } = useAuth();
  return useQuery({
    queryKey: todosQueryKey(username ?? ''),
    queryFn: () =>
      api.get<Todo[]>(`/users/${username}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token && !!username,
  });
}
