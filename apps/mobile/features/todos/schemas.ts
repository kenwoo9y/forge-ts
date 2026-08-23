import { z } from 'zod';

export const todoFormSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(30, 'タイトルは30文字以内で入力してください'),
  description: z.string().max(255, '詳細は255文字以内で入力してください').nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(['todo', 'doing', 'done']),
});

export type TodoFormValues = z.infer<typeof todoFormSchema>;
