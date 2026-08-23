import { z } from 'zod';

export const taskStatusEnum = z.enum(['todo', 'doing', 'done']);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(30),
  description: z.string().max(255).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: taskStatusEnum.default('todo'),
  ownerId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(30).optional(),
  description: z.string().max(255).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: taskStatusEnum.optional(),
  ownerId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional(),
});

export type TaskStatus = z.infer<typeof taskStatusEnum>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
