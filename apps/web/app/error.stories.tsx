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
    error: Object.assign(new globalThis.Error("An unexpected error occurred"), {
      digest: "digest-001",
    }),
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
        "Failed to connect to the database. Please try again later.",
      ),
      { digest: "digest-002" },
    ),
  },
};
