import { AppLayout } from "@/components/layouts/app-layout";
import { TodoList } from "@/features/todos/components/todo-list";

export default function TodosPage() {
  return (
    <AppLayout>
      <TodoList />
    </AppLayout>
  );
}
