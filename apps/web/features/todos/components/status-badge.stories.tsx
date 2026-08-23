import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StatusBadge } from "./status-badge";

const meta = {
  title: "Todos/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["todo", "doing", "done", null],
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Todo: Story = {
  args: { status: "todo" },
};

export const Doing: Story = {
  args: { status: "doing" },
};

export const Done: Story = {
  args: { status: "done" },
};

export const Empty: Story = {
  args: { status: null },
};

export const AllStatuses: Story = {
  args: { status: "todo" },
  render: () => (
    <div className="flex items-center gap-3">
      <StatusBadge status="todo" />
      <StatusBadge status="doing" />
      <StatusBadge status="done" />
      <StatusBadge status={null} />
    </div>
  ),
};
