import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

import { DeleteTodoDialog } from "./delete-todo-dialog";

const sampleTodo = {
  publicId: "todo-001",
  title: "デザインレビューを完了させる",
  description: "UIコンポーネントの最終確認を行う",
  dueDate: "2026-03-15T00:00:00.000Z",
  status: "doing" as const,
  ownerId: "user-001",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-08T00:00:00.000Z",
};

const meta = {
  title: "Todos/DeleteTodoDialog",
  component: DeleteTodoDialog,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    todo: sampleTodo,
    username: "testuser",
    onClose: fn(),
  },
} satisfies Meta<typeof DeleteTodoDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = {
  beforeEach() {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => new Promise(() => {});
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "削除する" }));
  },
};

export const FetchError: Story = {
  beforeEach() {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      jsonResponse({ error: "Internal Server Error" }, 500);
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "削除する" }));
  },
};

export const LongTitle: Story = {
  args: {
    todo: {
      ...sampleTodo,
      title:
        "これは非常に長いタイトルのToDoアイテムで、表示崩れが起きないかの確認用です",
    },
  },
};

export const NoTitle: Story = {
  args: {
    todo: {
      ...sampleTodo,
      title: null,
    },
  },
};
