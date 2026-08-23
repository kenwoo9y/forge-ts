import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { PasswordForm } from "./password-form";

const meta = {
  title: "Settings/PasswordForm",
  component: PasswordForm,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof PasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// APIを呼ばないので認証セッション不要（グローバルデコレーターのみで動作する）
export const Default: Story = {};

export const WithValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "変更する" }));
  },
};

export const Submitting: Story = {
  beforeEach() {
    const original = globalThis.fetch;
    globalThis.fetch = () => new Promise(() => {});
    return () => {
      globalThis.fetch = original;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText(/新しいパスワード \*/),
      "new-password-123",
    );
    await userEvent.type(
      canvas.getByLabelText(/パスワード（確認）/),
      "new-password-123",
    );
    await userEvent.click(canvas.getByRole("button", { name: "変更する" }));
  },
};
