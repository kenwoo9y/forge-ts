export type TodoStatus = "todo" | "doing" | "done";

export type Todo = {
  publicId: string;
  title: string | null;
  description: string | null;
  dueDate: string | null;
  status: TodoStatus | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};
