import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import ErrorPage from "./error";

const meta = {
  title: "App/Error",
  component: ErrorPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    error: Object.assign(
      new globalThis.Error("予期しないエラーが発生しました"),
      {
        digest: "digest-001",
      },
    ),
    reset: fn(),
  },
} satisfies Meta<typeof ErrorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLongMessage: Story = {
  args: {
    error: Object.assign(
      new globalThis.Error(
        "データベース接続に失敗しました。しばらく時間をおいてから再度お試しください。",
      ),
      { digest: "digest-002" },
    ),
  },
};
