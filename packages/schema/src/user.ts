import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(1).max(30),
  email: z.email().max(80).nullable().optional(),
  firstName: z.string().max(40).nullable().optional(),
  lastName: z.string().max(40).nullable().optional(),
  password: z.string().min(8).max(128),
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
