/// <reference path="../declarations.d.ts" />

import type { Preview } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import React from "react";

import "../app/globals.css";

const preview: Preview = {
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      // biome-ignore lint/suspicious/noExplicitAny: SessionProvider type requires children in props but React.createElement receives them as 3rd argument
      const sessionProps = { session: null } as any;
      return React.createElement(
        SessionProvider,
        sessionProps,
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(Story),
        ),
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
