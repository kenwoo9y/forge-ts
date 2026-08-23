import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteTodoAction } from "../actions";
import { getTodosQueryOptions } from "./get-todos";

export const useDeleteTodo = (publicId: string, username?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteTodoAction(publicId),
    onSuccess: () => {
      if (username) {
        queryClient.invalidateQueries(getTodosQueryOptions(username));
      }
    },
  });
};
