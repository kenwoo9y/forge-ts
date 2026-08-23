import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";
import { fn } from "storybook/test";

import { Header } from "./header";

const meta = {
  title: "Layouts/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onMenuClick: fn(),
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

// グローバルデコレーターの SessionProvider(session=null) により未認証状態で表示
export const Unauthenticated: Story = {};

// ストーリーレベルのデコレーターで session を上書きし、ログイン済み状態を表示
export const Authenticated: Story = {
  decorators: [
    (Story) => (
      <SessionProvider
        session={{
          user: { name: "山田 太郎" },
          expires: "2099-01-01",
          apiToken: "mock-token",
        }}
      >
        <Story />
      </SessionProvider>
    ),
  ],
};
