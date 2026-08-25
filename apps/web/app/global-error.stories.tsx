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
      new globalThis.Error("An application error has occurred"),
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
        "An unexpected error occurred while initializing the root layout. Please reload the page.",
      ),
      { digest: "digest-002" },
    ),
  },
};
