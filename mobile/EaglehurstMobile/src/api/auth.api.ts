/**
 * Authentication API
 * All authentication-related endpoints
 */

import apiClient from './client';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserProfile,
  ApiResponse,
} from '../types';

export const authAPI = {
  /**
   * Register new user
   */
  register: async (
    data: RegisterRequest
  ): Promise<
    ApiResponse<{
      user_id: string;
      email: string;
      verification_required: boolean;
      verification_token: string;
    }>
  > => {
    return apiClient.post('/auth/register', data);
  },

  /**
   * Login user
   */
  login: async (credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    return apiClient.post('/auth/login', credentials);
  },

  /**
   * Verify email with OTP
   */
  verifyEmail: async (
    verificationToken: string,
    otp: string
  ): Promise<
    ApiResponse<{
      user_id: string;
      email: string;
      is_verified: boolean;
    }>
  > => {
    return apiClient.post('/auth/verify-email-token', {
      verification_token: verificationToken,
      otp,
    });
  },

  /**
   * Resend OTP
   */
  resendOTP: async (
    verificationToken: string
  ): Promise<ApiResponse<{ email: string }>> => {
    return apiClient.post('/auth/resend-otp-token', {
      verification_token: verificationToken,
    });
  },

  /**
   * Forgot password
   */
  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Reset password
   */
  resetPassword: async (
    token: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<ApiResponse<UserProfile>> => {
    return apiClient.get('/auth/me');
  },

  /**
   * Logout
   */
  logout: async (): Promise<ApiResponse<void>> => {
    return apiClient.post('/auth/logout');
  },

  /**
   * Refresh token
   */
  refreshToken: async (
    refreshToken: string
  ): Promise<
    ApiResponse<{
      access_token: string;
      refresh_token: string;
    }>
  > => {
    return apiClient.post('/auth/refresh-token', {
      refresh_token: refreshToken,
    });
  },
};

export default authAPI;

