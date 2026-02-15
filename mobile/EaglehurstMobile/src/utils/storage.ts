/**
 * Secure Storage Utilities
 * Using react-native-keychain for sensitive data and AsyncStorage for non-sensitive data
 */

import * as Keychain from 'react-native-keychain';
// Temporary: Using in-memory storage instead of AsyncStorage due to codegen issues
// import AsyncStorage from '@react-native-async-storage/async-storage';
const memoryStorage: { [key: string]: string } = {};
const AsyncStorage = {
  setItem: async (key: string, value: string) => { memoryStorage[key] = value; },
  getItem: async (key: string) => memoryStorage[key] || null,
  removeItem: async (key: string) => { delete memoryStorage[key]; },
};

import { STORAGE_KEYS } from '../constants';
import { User } from '../types';

// Token Management (Secure)
export const setToken = async (token: string): Promise<void> => {
  try {
    await Keychain.setGenericPassword('access_token', token, {
      service: STORAGE_KEYS.ACCESS_TOKEN,
    });
  } catch (error) {
    console.error('Error saving access token:', error);
    throw error;
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: STORAGE_KEYS.ACCESS_TOKEN,
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
};

export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    await Keychain.setGenericPassword('refresh_token', token, {
      service: STORAGE_KEYS.REFRESH_TOKEN,
    });
  } catch (error) {
    console.error('Error saving refresh token:', error);
    throw error;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: STORAGE_KEYS.REFRESH_TOKEN,
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

export const removeTokens = async (): Promise<void> => {
  try {
    await Promise.all([
      Keychain.resetGenericPassword({ service: STORAGE_KEYS.ACCESS_TOKEN }),
      Keychain.resetGenericPassword({ service: STORAGE_KEYS.REFRESH_TOKEN }),
    ]);
  } catch (error) {
    console.error('Error removing tokens:', error);
    throw error;
  }
};

// User Data Management (AsyncStorage)
export const setUserData = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

export const getUserData = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return null;
  }
};

export const removeUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
  } catch (error) {
    console.error('Error removing user data:', error);
    throw error;
  }
};

// Onboarding Status
export const setOnboardingComplete = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  } catch (error) {
    console.error('Error setting onboarding status:', error);
    throw error;
  }
};

export const isOnboardingComplete = async (): Promise<boolean> => {
  try {
    const status = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return status === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

// Clear All Data
export const clearAllData = async (): Promise<void> => {
  try {
    await Promise.all([
      removeTokens(),
      removeUserData(),
      AsyncStorage.clear(),
    ]);
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
};

export default {
  setToken,
  getToken,
  setRefreshToken,
  getRefreshToken,
  removeTokens,
  setUserData,
  getUserData,
  removeUserData,
  setOnboardingComplete,
  isOnboardingComplete,
  clearAllData,
};

