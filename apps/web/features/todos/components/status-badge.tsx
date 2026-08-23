import type { TodoStatus } from "../types";

const STATUS_CONFIG: Record<TodoStatus, { label: string; className: string }> =
  {
    doing: {
      label: "進行中",
      className: "bg-blue-100 text-blue-600 border border-blue-200",
    },
    todo: {
      label: "未着手",
      className: "bg-gray-100 text-gray-500 border border-gray-200",
    },
    done: {
      label: "完了",
      className: "bg-green-100 text-green-600 border border-green-200",
    },
  };

type StatusBadgeProps = {
  status: TodoStatus | null;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return <span className="text-gray-400">-</span>;

  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
