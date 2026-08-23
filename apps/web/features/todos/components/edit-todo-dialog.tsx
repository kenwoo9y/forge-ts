"use client";

import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zodResolver";

import { useUpdateTodo } from "../api/update-todo";
import { type TodoFormValues, todoFormSchema } from "../schemas";
import type { Todo } from "../types";

const STATUS_OPTIONS = [
  { value: "todo", label: "未着手" },
  { value: "doing", label: "進行中" },
  { value: "done", label: "完了" },
] as const;

type EditTodoDialogProps = {
  todo: Todo;
  username?: string;
  onClose: () => void;
};

export function EditTodoDialog({
  todo,
  username,
  onClose,
}: EditTodoDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: todo.title ?? "",
      description: todo.description ?? "",
      dueDate: todo.dueDate ? todo.dueDate.slice(0, 10) : "",
      status: todo.status ?? "todo",
    },
  });

  const {
    mutate: updateTodo,
    isPending,
    isError,
    error,
  } = useUpdateTodo(todo.publicId, username);

  const onSubmit = (values: TodoFormValues) => {
    updateTodo(
      {
        title: values.title,
        description: values.description ?? null,
        dueDate: values.dueDate ? `${values.dueDate}T00:00:00.000Z` : null,
        status: values.status,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">ToDoを編集</h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <hr className="mb-6 border-gray-200" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="edit-title"
              className="mb-1.5 block text-sm text-gray-600"
            >
              タイトル
            </label>
            <input
              id="edit-title"
              type="text"
              {...register("title")}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-description"
              className="mb-1.5 block text-sm text-gray-600"
            >
              詳細
            </label>
            <textarea
              id="edit-description"
              rows={5}
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-dueDate"
              className="mb-1.5 block text-sm text-gray-600"
            >
              期日
            </label>
            <input
              id="edit-dueDate"
              type="date"
              {...register("dueDate")}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-500">
                {errors.dueDate.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-status"
              className="mb-1.5 block text-sm text-gray-600"
            >
              ステータス
            </label>
            <select
              id="edit-status"
              {...register("status")}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="mt-1 text-xs text-red-500">
                {errors.status.message}
              </p>
            )}
          </div>

          {isError && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error?.message ?? "エラーが発生しました"}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-amber-600 py-3 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
