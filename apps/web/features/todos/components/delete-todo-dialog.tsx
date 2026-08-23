"use client";

import { AlertTriangle, X } from "lucide-react";

import { useDeleteTodo } from "../api/delete-todo";
import type { Todo } from "../types";

type DeleteTodoDialogProps = {
  todo: Todo;
  username?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function DeleteTodoDialog({
  todo,
  username,
  onClose,
  onSuccess,
}: DeleteTodoDialogProps) {
  const {
    mutate: deleteTodo,
    isPending,
    isError,
    error,
  } = useDeleteTodo(todo.publicId, username);

  const handleDelete = () => {
    deleteTodo(undefined, {
      onSuccess: () => {
        onClose();
        onSuccess?.();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">ToDoを削除</h2>
          </div>
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

        {/* タイトル表示 */}
        <div className="mb-4 rounded-lg bg-gray-100 px-4 py-3">
          <p className="mb-1 text-xs text-gray-500">タイトル：</p>
          <p className="text-sm text-gray-900">{todo.title ?? "-"}</p>
        </div>

        {/* 確認メッセージ */}
        <p className="mb-6 text-sm text-gray-700">
          このToDoを削除してもよろしいですか？この操作は取り消せません。
        </p>

        {/* エラーメッセージ */}
        {isError && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error?.message ?? "削除に失敗しました"}
          </p>
        )}

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
