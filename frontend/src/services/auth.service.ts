import { apiService } from './api';
import { TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../constants';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  User, 
  UserProfile,
  ApiResponse 
} from '../types';

export class AuthService {
  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return apiService.post<AuthResponse>('/auth/login', credentials);
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<{ user_id: string; email: string; verification_required: boolean; verification_token: string }>> {
    return apiService.post('/auth/register', userData);
  }

  async verifyEmail(email: string, otp: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post('/auth/verify-email', { email, otp });
  }

  async verifyEmailWithToken(verificationToken: string, otp: string): Promise<ApiResponse<{ user_id: string; email: string; is_verified: boolean }>> {
    return apiService.post('/auth/verify-email-token', { verification_token: verificationToken, otp });
  }

  async resendOTP(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post('/auth/resend-otp', { email });
  }

  async resendOTPWithToken(verificationToken: string): Promise<ApiResponse<{ email: string }>> {
    return apiService.post('/auth/resend-otp-token', { verification_token: verificationToken });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    return apiService.post('/auth/refresh-token', { refresh_token: refreshToken });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post('/auth/reset-password', { token, new_password: newPassword });
  }

  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return apiService.get<UserProfile>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } finally {
      apiService.removeAuthToken();
    }
  }

  // Local storage helpers
  saveAuthData(authResponse: AuthResponse): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, authResponse.access_token);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, authResponse.refresh_token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authResponse.user));
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  clearAuthData(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_STORAGE_KEY);
  }

}

export const authService = new AuthService();
