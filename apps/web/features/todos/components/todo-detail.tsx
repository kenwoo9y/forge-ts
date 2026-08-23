"use client";

import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useTodo } from "../api/get-todo";
import { formatDate, formatDateTime } from "../utils";
import { DeleteTodoDialog } from "./delete-todo-dialog";
import { EditTodoDialog } from "./edit-todo-dialog";
import { StatusBadge } from "./status-badge";

type DetailRowProps = {
  label: string;
  children: React.ReactNode;
};

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[200px_1fr] border-b border-gray-200 last:border-0">
      <div className="bg-gray-50 px-6 py-4 text-sm text-gray-600">{label}</div>
      <div className="px-6 py-4 text-sm text-gray-900">{children}</div>
    </div>
  );
}

type TodoDetailProps = {
  publicId: string;
};

export function TodoDetail({ publicId }: TodoDetailProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const username = session?.user?.name ?? "";
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { data: todo, isLoading, isError } = useTodo(publicId);

  return (
    <div className="mx-auto max-w-5xl px-6 py-4">
      <Link
        href="/todos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        一覧に戻る
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ToDo詳細</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-orange-400 px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-50 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            編集
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-red-400 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            削除
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {[
            "タイトル",
            "詳細",
            "期日",
            "ステータス",
            "作成日時",
            "更新日時",
          ].map((label) => (
            <div
              key={label}
              className="grid grid-cols-[200px_1fr] border-b border-gray-200 last:border-0"
            >
              <div className="bg-gray-50 px-6 py-4 text-sm text-gray-600">
                {label}
              </div>
              <div className="px-6 py-4">
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="py-20 text-center text-gray-400">
          データの取得に失敗しました
        </div>
      )}

      {todo && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <DetailRow label="タイトル">{todo.title ?? "-"}</DetailRow>
            <DetailRow label="詳細">{todo.description ?? "-"}</DetailRow>
            <DetailRow label="期日">{formatDate(todo.dueDate)}</DetailRow>
            <DetailRow label="ステータス">
              <StatusBadge status={todo.status} />
            </DetailRow>
            <DetailRow label="作成日時">
              {formatDateTime(todo.createdAt)}
            </DetailRow>
            <DetailRow label="更新日時">
              {formatDateTime(todo.updatedAt)}
            </DetailRow>
          </div>

          {isEditOpen && (
            <EditTodoDialog
              todo={todo}
              username={username}
              onClose={() => setIsEditOpen(false)}
            />
          )}

          {isDeleteOpen && (
            <DeleteTodoDialog
              todo={todo}
              username={username}
              onClose={() => setIsDeleteOpen(false)}
              onSuccess={() => router.push("/todos")}
            />
          )}
        </>
      )}
    </div>
  );
}
