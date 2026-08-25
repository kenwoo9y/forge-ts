import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    apiToken?: string;
  }
  interface Session {
    /** JWT issued by the Hono API. Used in the Authorization header of API requests */
    apiToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string;
    /** JWT issued by the Hono API */
    apiToken: string;
  }
}
