import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(1).max(30),
  password: z.string().min(8).max(128),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
