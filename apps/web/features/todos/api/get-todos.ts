import { queryOptions, useQuery } from "@tanstack/react-query";

import { getTodosAction } from "../actions";
import type { Todo } from "../types";

export const getTodosQueryOptions = (username: string) =>
  queryOptions({
    queryKey: ["todos", { username }],
    queryFn: () => getTodosAction(username),
  });

export const useTodos = (username: string) => {
  return useQuery({
    queryKey: ["todos", { username }],
    queryFn: (): Promise<Todo[]> => getTodosAction(username),
    enabled: !!username,
  });
};
