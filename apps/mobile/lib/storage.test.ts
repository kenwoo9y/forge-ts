import * as SecureStore from 'expo-secure-store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from './storage';

// Define the Platform object with vi.hoisted before vi.mock runs
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
    it('calls SecureStore.getItemAsync with "api_token"', async () => {
      await storage.getToken();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('api_token');
    });
  });

  describe('setToken', () => {
    it('calls SecureStore.setItemAsync with "api_token" and the value', async () => {
      await storage.setToken('my-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('api_token', 'my-token');
    });
  });

  describe('getUsername', () => {
    it('calls SecureStore.getItemAsync with "username"', async () => {
      await storage.getUsername();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('username');
    });
  });

  describe('setUsername', () => {
    it('calls SecureStore.setItemAsync with "username" and the value', async () => {
      await storage.setUsername('testuser');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('username', 'testuser');
    });
  });

  describe('clear', () => {
    it('calls SecureStore.deleteItemAsync with "api_token"', async () => {
      await storage.clear();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('api_token');
    });

    it('calls SecureStore.deleteItemAsync with "username"', async () => {
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
    it('calls localStorage.getItem with "api_token"', async () => {
      await storage.getToken();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('api_token');
    });
  });

  describe('setToken', () => {
    it('calls localStorage.setItem with "api_token" and the value', async () => {
      await storage.setToken('my-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('api_token', 'my-token');
    });
  });

  describe('getUsername', () => {
    it('calls localStorage.getItem with "username"', async () => {
      await storage.getUsername();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('username');
    });
  });

  describe('setUsername', () => {
    it('calls localStorage.setItem with "username" and the value', async () => {
      await storage.setUsername('testuser');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('username', 'testuser');
    });
  });

  describe('clear', () => {
    it('calls localStorage.removeItem with "api_token"', async () => {
      await storage.clear();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('api_token');
    });

    it('calls localStorage.removeItem with "username"', async () => {
      await storage.clear();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('username');
    });
  });
});
