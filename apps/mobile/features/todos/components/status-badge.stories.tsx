import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge } from './status-badge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Todos/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Todo: Story = {
  args: {
    status: 'todo',
  },
};

export const Doing: Story = {
  args: {
    status: 'doing',
  },
};

export const Done: Story = {
  args: {
    status: 'done',
  },
};

export const Null: Story = {
  args: {
    status: null,
  },
};
