import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTodoAction } from "../actions";
import type { TodoStatus } from "../types";
import { getTodosQueryOptions } from "./get-todos";

type CreateTodoInput = {
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TodoStatus;
};

export const useCreateTodo = (username: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodoAction(username, input),
    onSuccess: () => {
      queryClient.invalidateQueries(getTodosQueryOptions(username));
    },
  });
};
