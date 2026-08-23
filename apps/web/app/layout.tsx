import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { auth } from "@/auth";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ToDoアプリケーション",
  description: "サンプルアプリケーション",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="ja">
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
