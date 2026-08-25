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

// Shown unauthenticated via the global decorator's SessionProvider (session=null)
export const Unauthenticated: Story = {};

// Overrides the session with a story-level decorator to show the signed-in state
export const Authenticated: Story = {
  decorators: [
    (Story) => (
      <SessionProvider
        session={{
          user: { name: "John Doe" },
          expires: "2099-01-01",
          apiToken: "mock-token",
        }}
      >
        <Story />
      </SessionProvider>
    ),
  ],
};
