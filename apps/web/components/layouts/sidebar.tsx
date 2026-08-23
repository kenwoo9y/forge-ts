import { House, LayoutList, Settings, X } from "lucide-react";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/todos", label: "ToDoリスト", icon: LayoutList },
  { href: "/settings", label: "設定", icon: Settings },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        aria-label="メニューを閉じる"
        onClick={onClose}
      />
      <div className="fixed top-14 bottom-12 left-0 z-50 w-80 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <span className="font-semibold text-gray-900">メニュー</span>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-4 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-4 rounded-md px-4 py-4 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon className="h-5 w-5 text-gray-500" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
