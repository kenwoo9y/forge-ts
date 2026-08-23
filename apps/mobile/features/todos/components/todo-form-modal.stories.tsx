import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TodoFormModal } from './todo-form-modal';

const meta = {
  title: 'Todos/TodoFormModal',
  component: TodoFormModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    visible: true,
    heading: 'ToDoフォーム',
    submitLabel: '送信',
    submitColor: 'text-blue-600',
    isPending: false,
    isError: false,
    error: null,
    onSubmit: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof TodoFormModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDefaultValues: Story = {
  args: {
    heading: 'ToDoを編集',
    submitLabel: '更新',
    submitColor: 'text-amber-600',
    defaultValues: {
      title: 'デザインレビューを完了させる',
      description: 'UIコンポーネントの最終確認を行う',
      dueDate: '2026-03-15',
      status: 'doing',
    },
  },
};

export const Pending: Story = {
  args: {
    isPending: true,
  },
};

export const WithError: Story = {
  args: {
    isError: true,
    error: new Error('エラーが発生しました'),
  },
};
