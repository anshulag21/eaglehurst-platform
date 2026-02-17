import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, UserProfile, LoginRequest, RegisterRequest, Notification } from '../../types';
import { authService } from '../../services/auth.service';
import { USER_STORAGE_KEY } from '../../constants';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  notification: Notification | null;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
  notification: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      if (response.success && response.data) {
        authService.saveAuthData(response.data);
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Login failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Registration failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ email, otp }: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyEmail(email, otp);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Email verification failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to get user profile');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user profile';
      return rejectWithValue(errorMessage);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      // Call server logout endpoint
      await authService.logout();
    } catch (error) {
      // Log error but don't fail - we still want to clear local data
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local auth data regardless of server response
      authService.clearAuthData();
    }
    return null;
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await authService.forgotPassword(email);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to send reset email');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      return rejectWithValue(errorMessage);
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }: { token: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const response = await authService.resetPassword(token, newPassword);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Password reset failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      return rejectWithValue(errorMessage);
    }
  }
);

// Initialize auth state from localStorage
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    try {
      const isAuthenticated = authService.isAuthenticated();

      if (!isAuthenticated) {
        // No token, ensure all auth data is cleared
        authService.clearAuthData();
        return { user: null, profile: null, isAuthenticated: false };
      }

      const storedUser = authService.getStoredUser();
      if (!storedUser) {
        // Token exists but no user data, clear everything
        authService.clearAuthData();
        return { user: null, profile: null, isAuthenticated: false };
      }

      // Try to get fresh user data to validate token
      const response = await authService.getCurrentUser();
      if (response.success && response.data) {
        // Update stored user with fresh verification status
        const updatedUser = { ...storedUser, is_verified: response.data.is_verified };
        return { user: updatedUser, profile: response.data, isAuthenticated: true };
      } else {
        // Token might be expired or invalid, clear auth data
        authService.clearAuthData();
        return { user: null, profile: null, isAuthenticated: false };
      }
    } catch {
      // Any error during initialization should clear auth data
      authService.clearAuthData();
      return { user: null, profile: null, isAuthenticated: false };
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearNotification: (state) => {
      state.notification = null;
    },
    logout: (state) => {
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
      state.notification = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },
    updateProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.profile = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.error = null;
      })

      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        // Extract notification from login response
        if (action.payload.user?.notification) {
          state.notification = action.payload.user.notification;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })

      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Verify email
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        // Update user verification status
        if (state.user) {
          state.user.is_verified = true;
          // Also update localStorage to keep it in sync
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.user));
        }
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        // Background update, don't set global loading
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        // state.isLoading = false; // Background update
        state.profile = action.payload;
        state.error = null;
        // Update user verification status from profile data
        if (state.user && action.payload) {
          state.user.is_verified = action.payload.is_verified;
          // Also update localStorage to keep it in sync
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.user));
        }
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        // state.isLoading = false; // Background update
        state.error = action.payload as string;
      })

      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.profile = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.profile = null;
        state.isAuthenticated = false;
        state.error = null;
      })

      // Forgot password
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Reset password
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearNotification, logout, updateProfile, setLoading } = authSlice.actions;
export default authSlice.reducer;
