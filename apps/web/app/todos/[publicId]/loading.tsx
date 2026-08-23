import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layouts/app-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function TodoDetailLoading() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-6 py-4">
        <span className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600">
          <ArrowLeft className="h-4 w-4" />
          一覧に戻る
        </span>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">ToDo詳細</h1>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>

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
      </div>
    </AppLayout>
  );
}
