import { useState } from 'react';
import { View } from 'react-native';
import { CreateTodoModal } from '@/features/todos/components/create-todo-modal';
import { TodoList } from '@/features/todos/components/todo-list';

export default function TodosScreen() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <View className="flex-1">
      <TodoList onCreatePress={() => setIsCreateOpen(true)} />
      <CreateTodoModal visible={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </View>
  );
}
