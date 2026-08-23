"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@/lib/zodResolver";
import { useUpdatePassword } from "../api/update-user";
import { type PasswordFormValues, passwordFormSchema } from "../schemas";

export function PasswordForm() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
  });

  const { mutateAsync: updatePassword } = useUpdatePassword();

  async function onSubmit(values: PasswordFormValues) {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updatePassword({ password: values.password });
      setSuccessMessage("パスワードを変更しました");
      reset();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "エラーが発生しました");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="size-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900">パスワード変更</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">新しいパスワードを設定します</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            新しいパスワード <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            placeholder="新しいパスワードを入力"
            {...register("password")}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            パスワード（確認）<span className="text-red-500">*</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="パスワードを再入力"
            {...register("confirmPassword")}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {successMessage && (
          <p className="text-sm text-green-600">{successMessage}</p>
        )}
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
        >
          変更する
        </button>
      </form>
    </div>
  );
}
