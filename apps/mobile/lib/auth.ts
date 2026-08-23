import { api } from './api-client';
import { storage } from './storage';

type SigninResponse = {
  token: string;
  username: string;
};

export async function signIn(username: string, password: string): Promise<void> {
  const data = await api.post<SigninResponse>('/auth/signin', {
    username,
    password,
  });
  await storage.setToken(data.token);
  await storage.setUsername(data.username);
}

export async function signOut(): Promise<void> {
  await storage.clear();
}
