import { queryOptions, useQuery } from "@tanstack/react-query";

import { getTodoAction } from "../actions";
import type { Todo } from "../types";

export const getTodoQueryOptions = (publicId: string) =>
  queryOptions({
    queryKey: ["todos", publicId],
    queryFn: () => getTodoAction(publicId),
  });

export const useTodo = (publicId: string) => {
  return useQuery({
    queryKey: ["todos", publicId],
    queryFn: (): Promise<Todo> => getTodoAction(publicId),
  });
};
