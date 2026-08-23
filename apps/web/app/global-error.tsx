"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="px-6 text-center">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            アプリケーションエラー
          </h2>
          <p className="mb-6 text-sm text-gray-500">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
