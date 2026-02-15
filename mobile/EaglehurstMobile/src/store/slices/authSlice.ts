/**
 * Auth Slice
 * Authentication state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI, userAPI } from '../../api';
import {
  setToken,
  setRefreshToken,
  setUserData,
  removeTokens,
  removeUserData,
  getToken,
  getUserData,
} from '../../utils/storage';
import { User, UserProfile, LoginRequest, RegisterRequest, AuthResponse } from '../../types';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Async Thunks
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      if (!token) {
        return null;
      }

      // Try to get user from storage first
      const storedUser = await getUserData();
      if (storedUser) {
        return storedUser;
      }

      // If not in storage, fetch from API
      const response = await authAPI.getCurrentUser();
      if (response.success && response.data) {
        await setUserData(response.data as User);
        return response.data as User;
      }

      return null;
    } catch (error: any) {
      // Extract only the message string, not the entire error object
      const errorMessage = typeof error === 'string' 
        ? error 
        : error?.message || 'Failed to initialize auth';
      return rejectWithValue(errorMessage);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);

      if (response.success && response.data) {
        const authData = response.data as AuthResponse;
        await setToken(authData.access_token);
        await setRefreshToken(authData.refresh_token);
        
        // Fetch full profile with seller/buyer data
        const profileResponse = await userAPI.getProfile();
        if (profileResponse.success && profileResponse.data) {
          const userProfile = profileResponse.data as UserProfile;
          await setUserData(userProfile);
          return userProfile;
        }
        
        // Fallback to basic user data if profile fetch fails
        await setUserData(authData.user);
        return authData.user as UserProfile;
      }

      return rejectWithValue(response.error?.message || 'Login failed');
    } catch (error: any) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error?.message || 'Login failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);

      if (response.success && response.data) {
        return response.data;
      }

      return rejectWithValue(response.error?.message || 'Registration failed');
    } catch (error: any) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error?.message || 'Registration failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authAPI.logout();
    await removeTokens();
    await removeUserData();
    return null;
  } catch (error: any) {
    // Even if API call fails, clear local data
    await removeTokens();
    await removeUserData();
    return null;
  }
});

export const refreshUserProfile = createAsyncThunk(
  'auth/refreshProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();

      if (response.success && response.data) {
        await setUserData(response.data as User);
        return response.data as User;
      }

      return rejectWithValue(response.error?.message || 'Failed to refresh profile');
    } catch (error: any) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error?.message || 'Failed to refresh profile';
      return rejectWithValue(errorMessage);
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // Initialize Auth
    builder.addCase(initializeAuth.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(initializeAuth.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      if (action.payload) {
        state.user = action.payload;
        state.isAuthenticated = true;
      }
    });
    builder.addCase(initializeAuth.rejected, (state) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.isAuthenticated = false;
    });

    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || action.error?.message || 'Login failed';
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state) => {
      state.isLoading = false;
      state.error = null;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || action.error?.message || 'Registration failed';
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    });

    // Refresh Profile
    builder.addCase(refreshUserProfile.fulfilled, (state, action) => {
      state.user = action.payload;
    });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;

