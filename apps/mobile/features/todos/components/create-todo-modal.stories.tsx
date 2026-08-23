import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CreateTodoModal } from './create-todo-modal';

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

const meta = {
  title: 'Todos/CreateTodoModal',
  component: CreateTodoModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    visible: true,
    onClose: fn(),
  },
} satisfies Meta<typeof CreateTodoModal>;

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
