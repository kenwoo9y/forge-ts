import { useRouter } from 'expo-router';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useTodos } from '../api/get-todos';
import type { Todo } from '../types';
import { formatDate } from '../utils';
import { StatusBadge } from './status-badge';

function TodoSkeleton() {
  return (
    <View className="px-4 py-4 border-b border-gray-100">
      <View className="h-4 w-48 bg-gray-200 rounded mb-2" />
      <View className="flex-row items-center gap-2">
        <View className="h-3 w-20 bg-gray-200 rounded" />
        <View className="h-5 w-14 bg-gray-200 rounded-full" />
      </View>
    </View>
  );
}

type TodoItemProps = {
  todo: Todo;
  onPress: () => void;
};

function TodoItem({ todo, onPress }: TodoItemProps) {
  return (
    <TouchableOpacity
      className="bg-white px-4 py-4 border-b border-gray-100 active:bg-gray-50"
      onPress={onPress}
    >
      <Text className="text-base font-medium text-gray-900 mb-1.5" numberOfLines={1}>
        {todo.title ?? '-'}
      </Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-xs text-gray-500">{formatDate(todo.dueDate)}</Text>
        <StatusBadge status={todo.status} />
      </View>
    </TouchableOpacity>
  );
}

type TodoListProps = {
  onCreatePress: () => void;
};

export function TodoList({ onCreatePress }: TodoListProps) {
  const router = useRouter();
  const { data: todos, isLoading, isError, refetch } = useTodos();

  return (
    <View className="flex-1 bg-gray-50">
      {isLoading && (
        <View className="bg-white rounded-lg mx-4 mt-4 overflow-hidden shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no meaningful key
            <TodoSkeleton key={i} />
          ))}
        </View>
      )}

      {isError && (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 mb-3">データの取得に失敗しました</Text>
          <TouchableOpacity className="px-4 py-2 bg-blue-600 rounded-lg" onPress={() => refetch()}>
            <Text className="text-white text-sm font-medium">再試行</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && todos?.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">ToDoがありません</Text>
        </View>
      )}

      {todos && todos.length > 0 && (
        <FlatList
          data={todos}
          keyExtractor={(item) => item.publicId}
          renderItem={({ item }) => (
            <TodoItem todo={item} onPress={() => router.push(`/(app)/todos/${item.publicId}`)} />
          )}
          className="flex-1 bg-white mx-4 mt-4 rounded-lg shadow-sm"
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg"
        onPress={onCreatePress}
      >
        <Text className="text-white text-3xl leading-none">+</Text>
      </TouchableOpacity>
    </View>
  );
}
