import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import GlobalError from "./global-error";

const meta = {
  title: "App/GlobalError",
  component: GlobalError,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    error: Object.assign(
      new globalThis.Error("アプリケーションエラーが発生しました"),
      {
        digest: "digest-001",
      },
    ),
    reset: fn(),
  },
} satisfies Meta<typeof GlobalError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLongMessage: Story = {
  args: {
    error: Object.assign(
      new globalThis.Error(
        "ルートレイアウトの初期化中に予期しないエラーが発生しました。ページを再読み込みしてください。",
      ),
      { digest: "digest-002" },
    ),
  },
};
