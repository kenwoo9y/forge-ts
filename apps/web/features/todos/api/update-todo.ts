import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTodoAction } from "../actions";
import type { TodoStatus } from "../types";
import { getTodoQueryOptions } from "./get-todo";
import { getTodosQueryOptions } from "./get-todos";

type UpdateTodoInput = {
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TodoStatus;
};

export const useUpdateTodo = (publicId: string, username?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTodoInput) => updateTodoAction(publicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries(getTodoQueryOptions(publicId));
      if (username) {
        queryClient.invalidateQueries(getTodosQueryOptions(username));
      }
    },
  });
};
