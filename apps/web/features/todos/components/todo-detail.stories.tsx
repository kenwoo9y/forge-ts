import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";

import type { Todo } from "../types";
import { TodoDetail } from "./todo-detail";

const mockSession = {
  user: { name: "testuser" },
  expires: "2099-01-01",
  apiToken: "mock-token",
};

const sampleTodo: Todo = {
  publicId: "todo-001",
  title: "デザインレビューを完了させる",
  description:
    "UIコンポーネントの最終確認を行う。各バリアントとインタラクションを検証する。",
  dueDate: "2026-03-15T00:00:00.000Z",
  status: "doing",
  ownerId: "testuser",
  createdAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-08T12:30:00.000Z",
};

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const withAuthenticatedSession = (Story: React.ComponentType) => (
  <SessionProvider session={mockSession}>
    <Story />
  </SessionProvider>
);

const meta = {
  title: "Todos/TodoDetail",
  component: TodoDetail,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
  args: {
    publicId: "todo-001",
  },
  decorators: [withAuthenticatedSession],
} satisfies Meta<typeof TodoDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () => new Promise(() => {});
    return () => {
      globalThis.fetch = original;
    };
  },
};

export const WithData: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () => jsonResponse(sampleTodo);
    return () => {
      globalThis.fetch = original;
    };
  },
};

export const WithMinimalData: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () =>
      jsonResponse({
        ...sampleTodo,
        title: null,
        description: null,
        dueDate: null,
        status: null,
      });
    return () => {
      globalThis.fetch = original;
    };
  },
};

export const FetchError: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () => jsonResponse({ error: "Not Found" }, 404);
    return () => {
      globalThis.fetch = original;
    };
  },
};
