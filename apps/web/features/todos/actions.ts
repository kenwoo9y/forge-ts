"use server";

import type { CreateTaskInput, UpdateTaskInput } from "schema";
import { auth } from "@/auth";
import { apiClient, unwrap } from "@/lib/hono-client";
import type { Todo } from "./types";

async function authHeaders() {
  const session = await auth();
  const token = session?.apiToken;
  if (!token) throw new Error("認証が必要です");
  return { Authorization: `Bearer ${token}` };
}

export async function getTodosAction(username: string): Promise<Todo[]> {
  const headers = await authHeaders();
  const res = await apiClient.users[":username"].tasks.$get(
    { param: { username } },
    { headers },
  );
  return unwrap<Todo[]>(res);
}

export async function getTodoAction(publicId: string): Promise<Todo> {
  const headers = await authHeaders();
  const res = await apiClient.tasks[":publicId"].$get(
    { param: { publicId } },
    { headers },
  );
  return unwrap<Todo>(res);
}

export async function createTodoAction(
  username: string,
  input: Omit<CreateTaskInput, "ownerId">,
): Promise<Todo> {
  const headers = await authHeaders();
  const res = await apiClient.users[":username"].tasks.$post(
    { param: { username }, json: input },
    { headers },
  );
  return unwrap<Todo>(res);
}

export async function updateTodoAction(
  publicId: string,
  input: Omit<UpdateTaskInput, "ownerId">,
): Promise<Todo> {
  const headers = await authHeaders();
  const res = await apiClient.tasks[":publicId"].$patch(
    { param: { publicId }, json: input },
    { headers },
  );
  return unwrap<Todo>(res);
}

export async function deleteTodoAction(publicId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await apiClient.tasks[":publicId"].$delete(
    { param: { publicId } },
    { headers },
  );
  return unwrap<void>(res);
}
