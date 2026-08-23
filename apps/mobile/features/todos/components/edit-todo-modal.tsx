import { useUpdateTodo } from '../api/update-todo';
import type { TodoFormValues } from '../schemas';
import type { Todo } from '../types';
import { TodoFormModal } from './todo-form-modal';

type EditTodoModalProps = {
  todo: Todo;
  visible: boolean;
  onClose: () => void;
};

export function EditTodoModal({ todo, visible, onClose }: EditTodoModalProps) {
  const { mutate, isPending, isError, error, reset } = useUpdateTodo(todo.publicId);

  function handleSubmit(values: TodoFormValues) {
    mutate(
      {
        title: values.title,
        description: values.description ?? null,
        dueDate: values.dueDate ? `${values.dueDate}T00:00:00.000Z` : null,
        status: values.status,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  }

  return (
    <TodoFormModal
      visible={visible}
      heading="ToDoを編集"
      submitLabel="更新"
      submitColor="text-amber-600"
      defaultValues={{
        title: todo.title ?? '',
        description: todo.description ?? '',
        dueDate: todo.dueDate ? todo.dueDate.slice(0, 10) : '',
        status: todo.status ?? 'todo',
      }}
      isPending={isPending}
      isError={isError}
      error={error}
      onSubmit={handleSubmit}
      onClose={() => {
        reset();
        onClose();
      }}
    />
  );
}
