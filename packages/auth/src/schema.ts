import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const signupSchema = z.object({
  username: z
    .string()
    .min(1, 'Please enter a username')
    .max(30, 'Username must be at most 30 characters'),
  password: passwordSchema,
});

export const signinSchema = z.object({
  username: z
    .string()
    .min(1, 'Please enter a username')
    .max(30, 'Username must be at most 30 characters'),
  password: z.string().min(1, 'Please enter a password'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
