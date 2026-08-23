import { z } from "zod";

export const profileFormSchema = z.object({
  lastName: z.string().max(40, "姓は40文字以内で入力してください").optional(),
  firstName: z.string().max(40, "名は40文字以内で入力してください").optional(),
});

export const passwordFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .max(128, "パスワードは128文字以内で入力してください"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type PasswordFormValues = z.infer<typeof passwordFormSchema>;
