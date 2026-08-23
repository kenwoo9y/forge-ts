import NextAuth from "next-auth";
import { createAuthConfig } from "./lib/auth-config";

/** @public */
export const { handlers, auth, signIn, signOut } = NextAuth(createAuthConfig());
