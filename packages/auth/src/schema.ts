import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .max(128, 'パスワードは128文字以内で入力してください');

export const signupSchema = z.object({
  username: z
    .string()
    .min(1, 'ユーザー名を入力してください')
    .max(30, 'ユーザー名は30文字以内で入力してください'),
  email: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z
      .email('有効なメールアドレスを入力してください')
      .max(80, 'メールアドレスは80文字以内で入力してください')
      .optional()
  ),
  password: passwordSchema,
});

export const signinSchema = z.object({
  username: z
    .string()
    .min(1, 'ユーザー名を入力してください')
    .max(30, 'ユーザー名は30文字以内で入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
