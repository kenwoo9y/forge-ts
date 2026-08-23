import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'api_token';
const USERNAME_KEY = 'username';

const get = (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return Promise.resolve(localStorage.getItem(key));
  }
  return SecureStore.getItemAsync(key);
};

const set = (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }
  return SecureStore.setItemAsync(key, value);
};

const remove = (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(key);
};

export const storage = {
  getToken: () => get(TOKEN_KEY),
  setToken: (token: string) => set(TOKEN_KEY, token),
  getUsername: () => get(USERNAME_KEY),
  setUsername: (username: string) => set(USERNAME_KEY, username),
  async clear(): Promise<void> {
    await remove(TOKEN_KEY);
    await remove(USERNAME_KEY);
  },
};
