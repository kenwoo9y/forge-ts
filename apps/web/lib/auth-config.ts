import { signinSchema } from "auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { apiClient } from "./hono-client";

/**
 * NextAuth v5 設定ファクトリー。
 * CredentialsProvider でユーザー名・パスワード認証を行い、
 * Hono API の /auth/signin エンドポイントで JWT を取得する。
 *
 * @returns NextAuth 設定オブジェクト
 */
export function createAuthConfig(): NextAuthConfig {
  return {
    providers: [
      Credentials({
        credentials: {
          username: { label: "Username", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const parsed = signinSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const res = await apiClient.auth.signin.$post({
            json: {
              username: parsed.data.username,
              password: parsed.data.password,
            },
          });

          if (!res.ok) return null;

          const data = await res.json();

          return {
            id: data.username,
            name: data.username,
            apiToken: data.token,
          } satisfies { id: string; name: string; apiToken: string };
        },
      }),
    ],
    session: { strategy: "jwt" },
    trustHost: true,
    pages: {
      signIn: "/signin",
    },
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.username = user.name ?? "";
          token.apiToken = (user as { apiToken?: string }).apiToken ?? "";
        }
        return token;
      },
      session({ session, token }) {
        session.user.name = token.username;
        session.apiToken = token.apiToken;
        return session;
      },
    },
  };
}
