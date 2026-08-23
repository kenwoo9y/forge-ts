import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";

import { ProfileForm } from "./profile-form";

const mockSession = {
  user: { name: "testuser" },
  expires: "2099-01-01",
  apiToken: "mock-token",
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
  title: "Settings/ProfileForm",
  component: ProfileForm,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [withAuthenticatedSession],
} satisfies Meta<typeof ProfileForm>;

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
    globalThis.fetch = () =>
      jsonResponse({
        username: "testuser",
        email: "test@example.com",
        firstName: "太郎",
        lastName: "山田",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-03-08T00:00:00.000Z",
      });
    return () => {
      globalThis.fetch = original;
    };
  },
};

export const Empty: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () =>
      jsonResponse({
        username: "testuser",
        email: null,
        firstName: null,
        lastName: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-03-08T00:00:00.000Z",
      });
    return () => {
      globalThis.fetch = original;
    };
  },
};
