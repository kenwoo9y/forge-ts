import { Text, View } from 'react-native';
import type { TodoStatus } from '../types';

const STATUS_CONFIG: Record<
  TodoStatus,
  { label: string; className: string; textClassName: string }
> = {
  todo: {
    label: '未着手',
    className: 'bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5',
    textClassName: 'text-xs font-semibold text-gray-500',
  },
  doing: {
    label: '進行中',
    className: 'bg-blue-100 border border-blue-200 rounded-full px-2.5 py-0.5',
    textClassName: 'text-xs font-semibold text-blue-600',
  },
  done: {
    label: '完了',
    className: 'bg-green-100 border border-green-200 rounded-full px-2.5 py-0.5',
    textClassName: 'text-xs font-semibold text-green-600',
  },
};

type StatusBadgeProps = {
  status: TodoStatus | null;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return <Text className="text-gray-400">-</Text>;

  const config = STATUS_CONFIG[status];
  return (
    <View className={config.className}>
      <Text className={config.textClassName}>{config.label}</Text>
    </View>
  );
}
