import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { Todo } from '../types';
import { EditTodoModal } from './edit-todo-modal';

const sampleTodo: Todo = {
  publicId: 'todo-001',
  title: 'デザインレビューを完了させる',
  description: 'UIコンポーネントの最終確認を行う',
  dueDate: '2026-03-15T00:00:00.000Z',
  status: 'doing',
  ownerId: 'testuser',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-08T00:00:00.000Z',
};

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

const meta = {
  title: 'Todos/EditTodoModal',
  component: EditTodoModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    todo: sampleTodo,
    visible: true,
    onClose: fn(),
  },
} satisfies Meta<typeof EditTodoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () => new Promise(() => {});
    return () => {
      globalThis.fetch = original;
    };
  },
};

export const FetchError: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () => jsonResponse({ error: 'Internal Server Error' }, 500);
    return () => {
      globalThis.fetch = original;
    };
  },
};

export const StatusTodo: Story = {
  args: {
    todo: { ...sampleTodo, status: 'todo', description: null, dueDate: null },
  },
};

export const StatusDone: Story = {
  args: {
    todo: { ...sampleTodo, status: 'done' },
  },
};
