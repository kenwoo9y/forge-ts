"use client";

import { type SigninInput, signinSchema } from "auth";
import { Lock, LogIn, User } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zodResolver";

export default function SigninPage() {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninInput>({
    resolver: zodResolver(signinSchema),
  });

  async function onSubmit(data: SigninInput) {
    setError(null);
    const result = await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setError("Incorrect username or password");
    } else {
      window.location.assign("/");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 via-slate-100 to-blue-100 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Sign in</h1>

      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                {...register("username")}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
              />
            </div>
            {errors.username && (
              <p className="text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password")}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-base transition-colors disabled:opacity-50"
          >
            <LogIn className="size-4" />
            Sign in
          </button>
        </form>

        <hr className="my-6 border-gray-100" />

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-blue-500 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
