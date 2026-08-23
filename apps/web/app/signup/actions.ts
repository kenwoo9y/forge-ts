"use server";

import type { CreateUserInput } from "schema";
import { apiClient, unwrap } from "@/lib/hono-client";

type UserResponse = {
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function signupAction(
  input: CreateUserInput,
): Promise<UserResponse> {
  const res = await apiClient.users.$post({ json: input });
  return unwrap<UserResponse>(res);
}
