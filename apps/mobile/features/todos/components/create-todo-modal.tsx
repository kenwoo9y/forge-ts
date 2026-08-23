import { useCreateTodo } from '../api/create-todo';
import type { TodoFormValues } from '../schemas';
import { TodoFormModal } from './todo-form-modal';

type CreateTodoModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function CreateTodoModal({ visible, onClose }: CreateTodoModalProps) {
  const { mutate, isPending, isError, error, reset } = useCreateTodo();

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
      heading="新しいToDoを追加"
      submitLabel="追加"
      submitColor="text-blue-600"
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
