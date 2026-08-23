import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import { signOut } from '@/lib/auth';
import { storage } from '@/lib/storage';

type AuthState = {
  token: string | null;
  username: string | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  setAuth: (token: string, username: string) => void;
  clearAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within Providers');
  return ctx;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000 },
    mutations: {
      onError: (error) => {
        console.error('[QueryClient] Unhandled mutation error:', error);
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>({
    token: null,
    username: null,
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      const [token, username] = await Promise.all([storage.getToken(), storage.getUsername()]);
      setAuthState({ token, username, isLoading: false });
    })();
  }, []);

  function setAuth(token: string, username: string) {
    setAuthState({ token, username, isLoading: false });
  }

  async function clearAuth() {
    await signOut();
    queryClient.clear();
    setAuthState({ token: null, username: null, isLoading: false });
  }

  return (
    <AuthContext.Provider value={{ ...auth, setAuth, clearAuth }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
}
