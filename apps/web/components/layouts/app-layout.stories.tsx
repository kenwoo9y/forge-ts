import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";

import { AppLayout } from "./app-layout";

const authenticatedDecorator = (Story: React.ComponentType) => (
  <SessionProvider
    session={{
      user: { name: "山田 太郎" },
      expires: "2099-01-01",
      apiToken: "mock-token",
    }}
  >
    <Story />
  </SessionProvider>
);

const meta = {
  title: "Layouts/AppLayout",
  component: AppLayout,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    children: (
      <div className="p-6 text-gray-600">ページコンテンツがここに入ります</div>
    ),
  },
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unauthenticated: Story = {};

export const Authenticated: Story = {
  decorators: [authenticatedDecorator],
};

export const WithRichContent: Story = {
  decorators: [authenticatedDecorator],
  args: {
    children: (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">ToDoリスト</h1>
        <p className="text-gray-600">
          実際のページコンテンツが入る領域のサンプルです。
        </p>
      </div>
    ),
  },
};
