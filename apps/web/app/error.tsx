"use client";

import { useEffect } from "react";
import { AppLayout } from "@/components/layouts/app-layout";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          予期しないエラーが発生しました
        </h2>
        <p className="mb-6 text-sm text-gray-500">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    </AppLayout>
  );
}
