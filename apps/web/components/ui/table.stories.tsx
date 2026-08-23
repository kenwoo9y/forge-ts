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
  { id: 1, title: "デザインレビュー", dueDate: "2026-03-10", status: "進行中" },
  {
    id: 2,
    title: "APIドキュメント作成",
    dueDate: "2026-03-15",
    status: "未着手",
  },
  { id: 3, title: "テストコード追加", dueDate: "2026-03-20", status: "完了" },
  {
    id: 4,
    title: "パフォーマンス改善",
    dueDate: "2026-03-25",
    status: "未着手",
  },
  { id: 5, title: "デプロイ準備", dueDate: "2026-03-31", status: "完了" },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>ToDoリスト一覧</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>タイトル</TableHead>
          <TableHead>期日</TableHead>
          <TableHead>ステータス</TableHead>
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
          <TableHead>タイトル</TableHead>
          <TableHead>期日</TableHead>
          <TableHead>ステータス</TableHead>
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
          <TableCell colSpan={3}>合計</TableCell>
          <TableCell>{sampleRows.length}件</TableCell>
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
          <TableHead>タイトル</TableHead>
          <TableHead>期日</TableHead>
          <TableHead>ステータス</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="py-20 text-center text-gray-400">
            データがありません
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
