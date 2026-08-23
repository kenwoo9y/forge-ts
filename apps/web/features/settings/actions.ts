"use server";

import type { UpdateUserInput } from "schema";
import { auth } from "@/auth";
import { apiClient, unwrap } from "@/lib/hono-client";

type UserResponse = {
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
};

async function currentUser() {
  const session = await auth();
  const username = session?.user?.name;
  const token = session?.apiToken;
  if (!username || !token) throw new Error("認証が必要です");
  return { username, headers: { Authorization: `Bearer ${token}` } };
}

export async function getUserAction(): Promise<UserResponse> {
  const { username, headers } = await currentUser();
  const res = await apiClient.users[":username"].$get(
    { param: { username } },
    { headers },
  );
  return unwrap<UserResponse>(res);
}

export async function updateUserAction(
  input: Omit<UpdateUserInput, "username">,
): Promise<UserResponse> {
  const { username, headers } = await currentUser();
  const res = await apiClient.users[":username"].$patch(
    { param: { username }, json: input },
    { headers },
  );
  return unwrap<UserResponse>(res);
}
