import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { EditTodoModal } from '@/features/todos/components/edit-todo-modal';
import { TodoDetail } from '@/features/todos/components/todo-detail';
import type { Todo } from '@/features/todos/types';

export default function TodoDetailScreen() {
  const { publicId } = useLocalSearchParams<{ publicId: string }>();
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  return (
    <View className="flex-1">
      <TodoDetail publicId={publicId} onEditPress={setEditingTodo} />
      {editingTodo && (
        <EditTodoModal
          todo={editingTodo}
          visible={!!editingTodo}
          onClose={() => setEditingTodo(null)}
        />
      )}
    </View>
  );
}
