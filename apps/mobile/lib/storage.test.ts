import * as SecureStore from 'expo-secure-store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from './storage';

// vi.hoisted で Platform オブジェクトを vi.mock より先に定義する
const mockPlatform = vi.hoisted(() => ({ OS: 'ios' as string }));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-native', () => ({
  Platform: mockPlatform,
}));

const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
vi.stubGlobal('localStorage', mockLocalStorage);

describe('storage (native platform)', () => {
  beforeEach(() => {
    mockPlatform.OS = 'ios';
  });

  describe('getToken', () => {
    it('SecureStore.getItemAsync を "api_token" で呼ぶ', async () => {
      await storage.getToken();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('api_token');
    });
  });

  describe('setToken', () => {
    it('SecureStore.setItemAsync を "api_token" と値で呼ぶ', async () => {
      await storage.setToken('my-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('api_token', 'my-token');
    });
  });

  describe('getUsername', () => {
    it('SecureStore.getItemAsync を "username" で呼ぶ', async () => {
      await storage.getUsername();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('username');
    });
  });

  describe('setUsername', () => {
    it('SecureStore.setItemAsync を "username" と値で呼ぶ', async () => {
      await storage.setUsername('testuser');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('username', 'testuser');
    });
  });

  describe('clear', () => {
    it('SecureStore.deleteItemAsync を "api_token" で呼ぶ', async () => {
      await storage.clear();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('api_token');
    });

    it('SecureStore.deleteItemAsync を "username" で呼ぶ', async () => {
      await storage.clear();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('username');
    });
  });
});

describe('storage (web platform)', () => {
  beforeEach(() => {
    mockPlatform.OS = 'web';
  });

  describe('getToken', () => {
    it('localStorage.getItem を "api_token" で呼ぶ', async () => {
      await storage.getToken();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('api_token');
    });
  });

  describe('setToken', () => {
    it('localStorage.setItem を "api_token" と値で呼ぶ', async () => {
      await storage.setToken('my-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('api_token', 'my-token');
    });
  });

  describe('getUsername', () => {
    it('localStorage.getItem を "username" で呼ぶ', async () => {
      await storage.getUsername();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('username');
    });
  });

  describe('setUsername', () => {
    it('localStorage.setItem を "username" と値で呼ぶ', async () => {
      await storage.setUsername('testuser');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('username', 'testuser');
    });
  });

  describe('clear', () => {
    it('localStorage.removeItem を "api_token" で呼ぶ', async () => {
      await storage.clear();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('api_token');
    });

    it('localStorage.removeItem を "username" で呼ぶ', async () => {
      await storage.clear();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('username');
    });
  });
});
