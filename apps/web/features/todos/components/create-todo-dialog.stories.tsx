import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

import { CreateTodoDialog } from "./create-todo-dialog";

const meta = {
  title: "Todos/CreateTodoDialog",
  component: CreateTodoDialog,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    username: "testuser",
    onClose: fn(),
  },
} satisfies Meta<typeof CreateTodoDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = {
  beforeEach() {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => new Promise(() => {});
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("タイトル"), "テストToDo");
    await userEvent.click(canvas.getByRole("button", { name: "追加" }));
  },
};

export const FetchError: Story = {
  beforeEach() {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      jsonResponse({ error: "Internal Server Error" }, 500);
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("タイトル"), "テストToDo");
    await userEvent.click(canvas.getByRole("button", { name: "追加" }));
  },
};
