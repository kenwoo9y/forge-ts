"use client";

import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@/lib/zodResolver";
import { useGetUser } from "../api/get-user";
import { useUpdateProfile } from "../api/update-user";
import { type ProfileFormValues, profileFormSchema } from "../schemas";

export function ProfileForm() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: user, isLoading } = useGetUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        lastName: user.lastName ?? "",
        firstName: user.firstName ?? "",
      });
    }
  }, [user, reset]);

  const { mutateAsync: updateProfile } = useUpdateProfile();

  async function onSubmit(values: ProfileFormValues) {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateProfile({
        lastName: values.lastName || null,
        firstName: values.firstName || null,
      });
      setSuccessMessage("プロフィールを更新しました");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "エラーが発生しました");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <User className="size-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900">
          プロフィール情報
        </h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">氏名を変更できます</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700"
          >
            姓
          </label>
          <input
            id="lastName"
            type="text"
            placeholder="姓を入力"
            {...register("lastName")}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
          />
          {errors.lastName && (
            <p className="text-xs text-red-500">{errors.lastName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700"
          >
            名
          </label>
          <input
            id="firstName"
            type="text"
            placeholder="名を入力"
            {...register("firstName")}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
          />
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        {successMessage && (
          <p className="text-sm text-green-600">{successMessage}</p>
        )}
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
        >
          保存
        </button>
      </form>
    </div>
  );
}
