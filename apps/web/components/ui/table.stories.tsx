import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleRows = [
  {
    id: 1,
    title: "Design review",
    dueDate: "2026-03-10",
    status: "In progress",
  },
  {
    id: 2,
    title: "Write API docs",
    dueDate: "2026-03-15",
    status: "Not started",
  },
  { id: 3, title: "Add test code", dueDate: "2026-03-20", status: "Done" },
  {
    id: 4,
    title: "Performance improvements",
    dueDate: "2026-03-25",
    status: "Not started",
  },
  { id: 5, title: "Deployment prep", dueDate: "2026-03-31", status: "Done" },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>To-Do List</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sampleRows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="text-gray-400">{row.id}</TableCell>
            <TableCell>{row.title}</TableCell>
            <TableCell className="text-gray-600">{row.dueDate}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sampleRows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="text-gray-400">{row.id}</TableCell>
            <TableCell>{row.title}</TableCell>
            <TableCell className="text-gray-600">{row.dueDate}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell>{sampleRows.length} items</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="py-20 text-center text-gray-400">
            No data
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
