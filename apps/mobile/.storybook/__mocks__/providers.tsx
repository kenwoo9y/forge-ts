export function useAuth() {
  return {
    token: 'mock-token',
    username: 'testuser',
    isLoading: false,
    setAuth: () => {},
    clearAuth: async () => {},
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
