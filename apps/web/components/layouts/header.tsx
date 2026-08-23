"use client";

import { LogOut, Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="bg-blue-600 text-white">
      <div className="flex h-14 items-center gap-4 px-6">
        <button
          type="button"
          aria-label="メニュー"
          onClick={onMenuClick}
          className="text-white hover:text-blue-100 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="text-lg font-bold">ToDoアプリケーション</span>

        <div className="ml-auto flex items-center gap-3">
          {session?.user?.name && (
            <span className="text-sm text-blue-100">{session.user.name}</span>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/signin" })}
            className="flex items-center gap-1.5 text-sm text-white hover:text-blue-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
