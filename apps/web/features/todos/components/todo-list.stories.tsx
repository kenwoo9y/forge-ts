import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";

import type { Todo } from "../types";
import { TodoList } from "./todo-list";

const mockSession = {
  user: { name: "testuser" },
  expires: "2099-01-01",
  apiToken: "mock-token",
};

const sampleTodos: Todo[] = [
  {
    publicId: "todo-001",
    title: "デザインレビューを完了させる",
    description: "UIコンポーネントの最終確認を行う",
    dueDate: "2026-03-15T00:00:00.000Z",
    status: "doing",
    ownerId: "testuser",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
  },
  {
    publicId: "todo-002",
    title: "APIドキュメント作成",
    description: null,
    dueDate: "2026-03-20T00:00:00.000Z",
    status: "todo",
    ownerId: "testuser",
    createdAt: "2026-03-02T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
  },
  {
    publicId: "todo-003",
    title: "テストコード追加",
    description: "ユニットテストとE2Eテストを追加する",
    dueDate: "2026-03-25T00:00:00.000Z",
    status: "done",
    ownerId: "testuser",
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
  },
  {
    publicId: "todo-004",
    title: "パフォーマンス改善",
    description: null,
    dueDate: null,
    status: "todo",
    ownerId: "testuser",
    createdAt: "2026-03-04T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
  },
  {
    publicId: "todo-005",
    title: "デプロイ準備",
    description: "本番環境へのデプロイ手順を確認する",
    dueDate: "2026-03-31T00:00:00.000Z",
    status: "done",
    ownerId: "testuser",
    createdAt: "2026-03-05T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
  },
];

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
  title: "Todos/TodoList",
  component: TodoList,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
  decorators: [withAuthenticatedSession],
} satisfies Meta<typeof TodoList>;

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
    globalThis.fetch = () => jsonResponse(sampleTodos);
    return () => {
      globalThis.fetch = original;
    };
  },
};

export const Empty: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () => jsonResponse([]);
    return () => {
      globalThis.fetch = original;
    };
  },
};

export const FetchError: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () =>
      jsonResponse({ error: "Internal Server Error" }, 500);
    return () => {
      globalThis.fetch = original;
    };
  },
};
