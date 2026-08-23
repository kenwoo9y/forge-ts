"use client";

import {
  type ColumnDef,
  columnSizingFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTodos } from "../api/get-todos";
import type { Todo } from "../types";
import { formatDate } from "../utils";
import { CreateTodoDialog } from "./create-todo-dialog";
import { DeleteTodoDialog } from "./delete-todo-dialog";
import { EditTodoDialog } from "./edit-todo-dialog";
import { StatusBadge } from "./status-badge";

const STATUS_ORDER: Record<string, number> = {
  todo: 0,
  doing: 1,
  done: 2,
};

const PAGE_SIZE = 10;

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnSizingFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

type TodoTableProps = {
  todos: Todo[];
  onEditClick: (todo: Todo) => void;
  onDeleteClick: (todo: Todo) => void;
};

function TodoTable({ todos, onEditClick, onDeleteClick }: TodoTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isPending, startTransition] = useTransition();

  const columns = useMemo<ColumnDef<typeof features, Todo>[]>(
    () => [
      {
        accessorKey: "title",
        header: "タイトル",
        cell: ({ getValue }) => getValue<string>() ?? "-",
      },
      {
        accessorKey: "dueDate",
        header: "期日",
        cell: ({ getValue }) => (
          <span className="text-gray-600">
            {formatDate(getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "ステータス",
        cell: ({ getValue }) => (
          <StatusBadge status={getValue<Todo["status"]>()} />
        ),
        sortFn: (rowA, rowB) => {
          const a = STATUS_ORDER[rowA.original.status ?? ""] ?? 0;
          const b = STATUS_ORDER[rowB.original.status ?? ""] ?? 0;
          return a - b;
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="編集"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(row.original);
              }}
              className="text-orange-400 hover:text-orange-500 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="削除"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(row.original);
              }}
              className="text-red-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onEditClick, onDeleteClick],
  );

  const table = useTable({
    features,
    data: todos,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
  });

  const { pageIndex, pageSize } = table.state.pagination;
  const totalRows = table.getCoreRowModel().rows.length;
  const totalPages = table.getPageCount();

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm transition-opacity ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b border-gray-200 bg-white hover:bg-white"
            >
              <TableHead className="w-12 text-gray-500">#</TableHead>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <TableHead
                    key={header.id}
                    className="text-gray-500"
                    style={{ width: header.getSize() }}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sorted === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, rowIndex) => (
            <TableRow
              key={row.id}
              className="border-b border-gray-100 cursor-pointer"
              onClick={() =>
                startTransition(() =>
                  router.push(`/todos/${row.original.publicId}`),
                )
              }
            >
              <TableCell className="text-gray-400">
                {pageIndex * pageSize + rowIndex + 1}
              </TableCell>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-500">
            {totalRows}件中 {pageIndex * pageSize + 1}〜
            {Math.min((pageIndex + 1) * pageSize, totalRows)}件を表示
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="前のページ"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => table.setPageIndex(page - 1)}
                className={`h-7 w-7 rounded text-sm transition-colors ${
                  page === pageIndex + 1
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              aria-label="次のページ"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      }
    </div>
  );
}

export function TodoList() {
  const { data: session } = useSession();
  const username = session?.user?.name ?? "";
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const { data: todos, isLoading, isError } = useTodos(username);

  return (
    <div className="mx-auto max-w-5xl px-6 py-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ToDoリスト</h1>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          新規追加
        </Button>
      </div>

      {isCreateOpen && (
        <CreateTodoDialog
          username={username}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editingTodo && (
        <EditTodoDialog
          todo={editingTodo}
          username={username}
          onClose={() => setEditingTodo(null)}
        />
      )}

      {deletingTodo && (
        <DeleteTodoDialog
          todo={deletingTodo}
          username={username}
          onClose={() => setDeletingTodo(null)}
        />
      )}

      {isLoading && (
        <div className="rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-white hover:bg-white">
                <TableHead className="w-12 text-gray-500">#</TableHead>
                <TableHead className="text-gray-500">タイトル</TableHead>
                <TableHead className="text-gray-500">期日</TableHead>
                <TableHead className="text-gray-500">ステータス</TableHead>
                <TableHead className="text-gray-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no meaningful key
                <TableRow key={i} className="border-b border-gray-100">
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <div className="py-20 text-center text-gray-400">
          データの取得に失敗しました
        </div>
      )}

      {todos && todos.length === 0 && (
        <div className="py-20 text-center text-gray-400">ToDoがありません</div>
      )}

      {todos && todos.length > 0 && (
        <TodoTable
          todos={todos}
          onEditClick={setEditingTodo}
          onDeleteClick={setDeletingTodo}
        />
      )}
    </div>
  );
}
