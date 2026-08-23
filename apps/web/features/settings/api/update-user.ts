import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { updateUserAction } from "../actions";

export const useUpdateProfile = () => {
  const { data: session } = useSession();
  const username = session?.user?.name ?? "";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      firstName?: string | null;
      lastName?: string | null;
    }) => updateUserAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", username] });
    },
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: (input: { password: string }) => updateUserAction(input),
  });
};
