import type React from 'react';

export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
  navigate: () => {},
  dismiss: () => {},
  canGoBack: () => false,
});

export const useLocalSearchParams = <T extends Record<string, string>>(): T => ({}) as T;

export const useSegments = () => [];

export const usePathname = () => '/';

export const Link = ({ children }: { children: React.ReactNode; href: string }) =>
  children as React.ReactElement;

export const Redirect = () => null;

export const router = {
  push: () => {},
  replace: () => {},
  back: () => {},
  navigate: () => {},
  dismiss: () => {},
};
