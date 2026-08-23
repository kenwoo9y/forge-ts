import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    apiToken?: string;
  }
  interface Session {
    /** Hono API が発行した JWT。API リクエストの Authorization ヘッダーに使用する */
    apiToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string;
    /** Hono API が発行した JWT */
    apiToken: string;
  }
}
