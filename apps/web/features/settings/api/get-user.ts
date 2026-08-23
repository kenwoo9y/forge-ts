import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { getUserAction } from "../actions";

export const useGetUser = () => {
  const { data: session, status } = useSession();
  const username = session?.user?.name ?? "";

  return useQuery({
    queryKey: ["user", username],
    queryFn: () => getUserAction(),
    enabled: status === "authenticated",
  });
};
